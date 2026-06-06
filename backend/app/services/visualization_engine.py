"""
Visualization Decision Engine (VDE)
====================================
Pure synchronous function — no I/O, no async.
Called in sql_agent.py after execute_query() + generate_summary().

Inputs:
  question        : str              — original user question
  columns         : List[str]        — raw column names from asyncpg
  rows            : List[List[str?]] — stringified rows (existing contract)
  pg_column_types : List[str]        — PG OID type names extracted before str()

Output:
  ChartSpec | None  (None = table fallback → frontend renders DataTable as-is)

All rules documented in:
  docs/auto_visualization_plan.md  — Section 1 / Section 5
"""

import re
import logging
import random
from typing import List, Optional, Dict, Any

from app.models.schemas import (
    ChartSpec, AxisDef, YAxisDef, SeriesDef, KPIValue, ChartSpecMeta
)

logger = logging.getLogger(__name__)

# ── Column type constants ──────────────────────────────────────────────────

NUMERIC_PG_TYPES  = {"int2", "int4", "int8", "float4", "float8", "numeric", "money"}
TEMPORAL_PG_TYPES = {"date", "timestamp", "timestamptz", "timetz", "time"}
CATEGORICAL_PG_TYPES = {"text", "varchar", "char", "bpchar", "bool", "name"}

TEMPORAL_NAME_KEYWORDS = {"date", "year", "month", "quarter", "week", "day", "time", "period"}
MEASURE_KEYWORDS = {"count", "total", "amount", "revenue", "units", "qty", "sales",
                    "cost", "price", "value", "sum", "avg", "average", "budget",
                    "quota", "bonus", "profit", "margin", "tax"}
UNIT_DOLLAR_KEYWORDS = {"revenue", "amount", "price", "cost", "sales", "quota",
                        "bonus", "profit", "subtotal", "due", "paid", "total"}
UNIT_PCT_KEYWORDS    = {"rate", "pct", "percent", "margin", "ratio", "growth"}

QUESTION_STRIP_WORDS = [
    r"^show me\s+", r"^what are\s+", r"^what is\s+", r"^list\s+", r"^get\s+",
    r"^find\s+", r"^give me\s+", r"^display\s+", r"^how many\s+", r"^how much\s+",
    r"^tell me\s+", r"^provide\s+", r"^fetch\s+",
]

CHART_TYPE_SUFFIXES = {
    "bar":         "— Bar Chart",
    "line":        "— Line Chart",
    "pie":         "— Pie Chart",
    "donut":       "— Donut Chart",
    "scatter":     "— Scatter Plot",
    "grouped_bar": "— Grouped Bar Chart",
    "kpi_card":    "— KPI",
    "kpi_multi":   "— KPI Overview",
    "table":       "",
    "empty_state": "",
}


# ── 1. Column name normalization ───────────────────────────────────────────

def normalize_column_label(col: str) -> str:
    """
    Convert raw DB column names to human-readable labels.
    SalesOrderID → Sales Order
    total_revenue → Total Revenue
    TerritoryID   → Territory
    avg_order_value → Avg Order Value
    """
    # Split snake_case
    parts = col.split("_")
    result_parts = []
    for part in parts:
        # Split PascalCase within each token
        # Insert space before uppercase letters that follow lowercase
        pascal_split = re.sub(r"([a-z])([A-Z])", r"\1 \2", part)
        result_parts.extend(pascal_split.split())

    # Title-case all words
    words = [w.capitalize() for w in result_parts]

    # Remove trailing ID / Id
    if words and words[-1].upper() == "ID":
        words = words[:-1]

    return " ".join(words) if words else col


# ── 2. Chart title generation ──────────────────────────────────────────────

def generate_chart_title(question: str, chart_type: str) -> str:
    """
    Produce a plain-English chart title from the user's question.
    'Show me top 10 products by revenue' → 'Top 10 Products by Revenue — Bar Chart'
    """
    text = question.strip().rstrip("?.")
    for pattern in QUESTION_STRIP_WORDS:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
    text = text.strip()

    # Title-case
    text = " ".join(w.capitalize() for w in text.split())

    # Truncate at word boundary to 55 chars
    if len(text) > 55:
        text = text[:55].rsplit(" ", 1)[0]

    suffix = CHART_TYPE_SUFFIXES.get(chart_type, "")
    return f"{text} {suffix}".strip() if suffix else text


# ── 3. Unit inference ──────────────────────────────────────────────────────

def infer_unit(col: str) -> Optional[str]:
    lower = col.lower()
    if any(k in lower for k in UNIT_DOLLAR_KEYWORDS):
        return "$"
    if any(k in lower for k in UNIT_PCT_KEYWORDS):
        return "%"
    return None


# ── 4. Column classification ───────────────────────────────────────────────

def _classify_column(col: str, pg_type: str, values: List[Optional[str]]) -> str:
    """
    Returns one of: NUMERIC | TEMPORAL | CATEGORICAL | TEXT_FREE | IDENTIFIER
    Primary signal: pg_type.  Fallback: value-pattern matching.
    """
    col_lower = col.lower()
    pg_lower  = pg_type.lower()

    # IDENTIFIER: numeric PG type AND name ends with 'id'
    if pg_lower in NUMERIC_PG_TYPES and (col_lower.endswith("id") or col_lower == "id"):
        return "IDENTIFIER"

    # Primary: PG type
    if pg_lower in NUMERIC_PG_TYPES:
        return "NUMERIC"
    if pg_lower in TEMPORAL_PG_TYPES:
        return "TEMPORAL"
    if pg_lower in CATEGORICAL_PG_TYPES:
        # Check cardinality
        non_null = [v for v in values if v is not None]
        unique   = len(set(non_null))
        return "CATEGORICAL" if unique <= 50 else "TEXT_FREE"

    # Fallback: check name keywords for TEMPORAL
    if any(kw in col_lower for kw in TEMPORAL_NAME_KEYWORDS):
        return "TEMPORAL"

    # Fallback: numeric by value parsing
    non_null = [v for v in values if v is not None]
    if not non_null:
        return "CATEGORICAL"
    parseable = sum(1 for v in non_null if _try_float(v))
    if parseable / len(non_null) >= 0.8:
        # Still check identifier
        if col_lower.endswith("id") or col_lower == "id":
            return "IDENTIFIER"
        return "NUMERIC"

    # Fallback: cardinality check for CATEGORICAL vs TEXT_FREE
    unique = len(set(non_null))
    return "CATEGORICAL" if unique <= 50 else "TEXT_FREE"


def _try_float(v: str) -> bool:
    try:
        float(str(v).replace(",", "").replace("$", "").replace("%", ""))
        return True
    except (ValueError, TypeError):
        return False


# ── 5. Data transformation helpers ────────────────────────────────────────

def _col_values(rows: List[List[Optional[str]]], idx: int) -> List[Optional[str]]:
    return [row[idx] if idx < len(row) else None for row in rows]


def _safe_float(v: Optional[str]) -> float:
    if v is None:
        return 0.0
    try:
        return float(str(v).replace(",", "").replace("$", "").replace("%", ""))
    except (ValueError, TypeError):
        return 0.0


def _detect_time_granularity(values: List[str]) -> Optional[str]:
    """Detect date granularity from string values."""
    non_null = [v for v in values if v]
    if not non_null:
        return None
    sample = non_null[0]
    # timestamp: "2023-01-15 00:00:00" or "2023-01-15"
    if re.match(r"^\d{4}-\d{2}-\d{2}", sample):
        # Check if all values are first-of-month → monthly
        if all(re.match(r"^\d{4}-\d{2}-01", v[:10]) for v in non_null):
            return "monthly"
        return "daily"
    if re.match(r"^\d{4}-\d{2}$", sample):
        return "monthly"
    if re.match(r"^\d{4}$", sample):
        return "yearly"
    return None


def _generate_month_sequence(min_val: str, max_val: str) -> List[str]:
    """Generate YYYY-MM sequence between two YYYY-MM-DD or YYYY-MM strings."""
    def to_ym(s: str):
        s = s[:7]  # take YYYY-MM
        y, m = int(s[:4]), int(s[5:7])
        return y, m

    y1, m1 = to_ym(min_val)
    y2, m2 = to_ym(max_val)
    seq = []
    y, m = y1, m1
    while (y, m) <= (y2, m2):
        seq.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return seq


def _generate_year_sequence(min_val: str, max_val: str) -> List[str]:
    y1 = int(min_val[:4])
    y2 = int(max_val[:4])
    return [str(y) for y in range(y1, y2 + 1)]


def _gap_fill_line(data: List[dict], n_series: int) -> List[dict]:
    """
    Fill missing time periods with null values so Recharts renders
    visible line breaks instead of compressing the X-axis.
    """
    if not data:
        return data

    x_vals = [d["__x"] for d in data]
    granularity = _detect_time_granularity(x_vals)
    if granularity not in ("monthly", "yearly"):
        return data  # daily / unknown — too many points, skip gap fill

    min_x, max_x = min(x_vals), max(x_vals)

    if granularity == "monthly":
        full_seq = _generate_month_sequence(min_x, max_x)
        # Normalize existing keys to YYYY-MM
        existing = {d["__x"][:7]: d for d in data}
        null_vals = {f"__y{j}": None for j in range(n_series)}
        return [existing.get(period, {"__x": period, **null_vals}) for period in full_seq]

    if granularity == "yearly":
        full_seq = _generate_year_sequence(min_x, max_x)
        existing = {d["__x"][:4]: d for d in data}
        null_vals = {f"__y{j}": None for j in range(n_series)}
        return [existing.get(period, {"__x": period, **null_vals}) for period in full_seq]

    return data


# ── 6. Main VDE function ───────────────────────────────────────────────────

def build_chart_spec(
    question: str,
    columns: List[str],
    rows: List[List[Optional[str]]],
    pg_column_types: List[str],
) -> Optional[ChartSpec]:
    """
    Entry point. Returns ChartSpec or None (table fallback).
    Called synchronously — no await.
    """
    try:
        return _build(question, columns, rows, pg_column_types)
    except Exception as e:
        logger.error(f"VDE error (returning None / table fallback): {e}", exc_info=True)
        return None


def _build(
    question: str,
    columns: List[str],
    rows: List[List[Optional[str]]],
    pg_column_types: List[str],
) -> Optional[ChartSpec]:

    # Pad pg_column_types if shorter than columns (safety)
    while len(pg_column_types) < len(columns):
        pg_column_types.append("")

    n_cols = len(columns)
    n_rows = len(rows)

    # Classify every column
    col_types: Dict[int, str] = {}
    for i, col in enumerate(columns):
        values = _col_values(rows, i)
        col_types[i] = _classify_column(col, pg_column_types[i], values)

    # Active indices (exclude IDENTIFIER and TEXT_FREE from chart axes)
    numeric_idxs     = [i for i, t in col_types.items() if t == "NUMERIC"]
    temporal_idxs    = [i for i, t in col_types.items() if t == "TEMPORAL"]
    categorical_idxs = [i for i, t in col_types.items() if t == "CATEGORICAL"]

    row_count_original = n_rows

    # ── Rule 0: Empty ─────────────────────────────────────────
    if n_rows == 0:
        return ChartSpec(
            chart_type="empty_state",
            title=generate_chart_title(question, "empty_state"),
            data_transformed=[],
            meta=ChartSpecMeta(row_count_original=0, row_count_rendered=0, vde_rule_matched=0),
        )

    # ── Rule 1: KPI card (1 row, 1 numeric col) ───────────────
    if n_rows == 1 and len(numeric_idxs) == 1 and n_cols == 1:
        col = columns[numeric_idxs[0]]
        val = rows[0][numeric_idxs[0]]
        return ChartSpec(
            chart_type="kpi_card",
            title=generate_chart_title(question, "kpi_card"),
            kpi_values=[KPIValue(label=normalize_column_label(col), value=val, unit=infer_unit(col))],
            meta=ChartSpecMeta(row_count_original=1, row_count_rendered=1, vde_rule_matched=1),
        )

    # ── Rule 2: KPI multi (1 row, 2-6 numeric cols) ───────────
    if n_rows == 1 and 2 <= len(numeric_idxs) <= 6 and len(categorical_idxs) == 0:
        kpi_vals = [
            KPIValue(
                label=normalize_column_label(columns[i]),
                value=rows[0][i],
                unit=infer_unit(columns[i])
            )
            for i in numeric_idxs
        ]
        return ChartSpec(
            chart_type="kpi_multi",
            title=generate_chart_title(question, "kpi_multi"),
            kpi_values=kpi_vals,
            meta=ChartSpecMeta(row_count_original=1, row_count_rendered=1, vde_rule_matched=2),
        )

    # ── Rule 3: Pie / Donut ───────────────────────────────────
    if (len(categorical_idxs) == 1 and len(numeric_idxs) == 1
            and len(temporal_idxs) == 0 and 2 <= n_rows <= 12):
        cat_i, num_i = categorical_idxs[0], numeric_idxs[0]
        num_vals = [_safe_float(r[num_i]) for r in rows]
        if all(v >= 0 for v in num_vals):
            chart_type = "donut" if n_rows >= 5 else "pie"
            slices = rows[:5]
            data = [{"__name": str(r[cat_i] or "N/A"), "__value": _safe_float(r[num_i])} for r in slices]
            if n_rows > 5:
                other = sum(_safe_float(r[num_i]) for r in rows[5:])
                data.append({"__name": "Other", "__value": round(other, 4)})
            rendered = len(data)
            return ChartSpec(
                chart_type=chart_type,
                title=generate_chart_title(question, chart_type),
                series=[SeriesDef(column=columns[num_i], name=normalize_column_label(columns[num_i]),
                                  data_key="__value", color_index=0)],
                data_transformed=data,
                data_truncated=(n_rows > 5),
                meta=ChartSpecMeta(row_count_original=n_rows, row_count_rendered=rendered, vde_rule_matched=3),
            )

    # ── Rule 4: Line ──────────────────────────────────────────
    if len(temporal_idxs) >= 1 and 1 <= len(numeric_idxs) <= 3:
        time_i   = temporal_idxs[0]
        num_is   = numeric_idxs[:3]
        cap      = min(n_rows, 500)
        use_rows = rows[:cap]

        data = []
        for r in use_rows:
            entry: Dict[str, Any] = {"__x": str(r[time_i]) if r[time_i] else ""}
            for j, ni in enumerate(num_is):
                entry[f"__y{j}"] = _safe_float(r[ni]) if r[ni] is not None else None
            data.append(entry)

        gap_filled = False
        filled_data = _gap_fill_line(data, len(num_is))
        if len(filled_data) != len(data):
            gap_filled = True
            data = filled_data
        elif filled_data != data:
            gap_filled = True
            data = filled_data

        series = [
            SeriesDef(column=columns[ni], name=normalize_column_label(columns[ni]),
                      data_key=f"__y{j}", color_index=j)
            for j, ni in enumerate(num_is)
        ]
        return ChartSpec(
            chart_type="line",
            title=generate_chart_title(question, "line"),
            x_axis=AxisDef(column=columns[time_i], label=normalize_column_label(columns[time_i]), type="temporal"),
            y_axis=YAxisDef(
                columns=[columns[ni] for ni in num_is],
                labels=[normalize_column_label(columns[ni]) for ni in num_is],
                unit=infer_unit(columns[num_is[0]]),
            ),
            series=series,
            data_transformed=data,
            data_truncated=(n_rows > 500),
            meta=ChartSpecMeta(row_count_original=n_rows, row_count_rendered=len(data),
                               vde_rule_matched=4, gap_fill_applied=gap_filled),
        )

    # ── Rules 5 & 6: Grouped Bar / Bar ────────────────────────
    if len(categorical_idxs) == 1 and len(numeric_idxs) >= 1:
        cat_i   = categorical_idxs[0]
        num_is  = numeric_idxs[:4]  # max 4 series
        grouped = len(num_is) >= 2

        # Row cap
        row_cap = 20 if grouped else 30
        use_rows = rows
        truncated = False
        if n_rows > row_cap:
            # Sort by first numeric desc, take top N
            try:
                use_rows = sorted(rows, key=lambda r: _safe_float(r[num_is[0]]), reverse=True)[:row_cap]
            except Exception:
                use_rows = rows[:row_cap]
            truncated = True

        data = []
        for r in use_rows:
            entry: Dict[str, Any] = {"__x": str(r[cat_i] or "N/A")}
            for j, ni in enumerate(num_is):
                entry[f"__y{j}"] = _safe_float(r[ni])
            data.append(entry)

        # Dual-Y-axis check: if max ratio between any two series > 10×
        dual_y = False
        if grouped and len(num_is) >= 2:
            maxes = []
            for ni in num_is:
                vals = [_safe_float(r[ni]) for r in use_rows if r[ni] is not None]
                maxes.append(max(vals) if vals else 0)
            if maxes[0] > 0:
                ratios = [m / maxes[0] for m in maxes[1:] if maxes[0] > 0]
                if any(r < 0.1 or r > 10 for r in ratios):
                    dual_y = True

        series = []
        for j, ni in enumerate(num_is):
            y_axis_id = "left" if (not dual_y or j == 0) else "right"
            series.append(SeriesDef(
                column=columns[ni], name=normalize_column_label(columns[ni]),
                data_key=f"__y{j}", color_index=j, y_axis_id=y_axis_id
            ))

        chart_type = "grouped_bar" if grouped else "bar"
        return ChartSpec(
            chart_type=chart_type,
            title=generate_chart_title(question, chart_type),
            x_axis=AxisDef(column=columns[cat_i], label=normalize_column_label(columns[cat_i]), type="categorical"),
            y_axis=YAxisDef(
                columns=[columns[ni] for ni in num_is],
                labels=[normalize_column_label(columns[ni]) for ni in num_is],
                unit=infer_unit(columns[num_is[0]]),
            ),
            series=series,
            dual_y_axis=dual_y,
            data_transformed=data,
            data_truncated=truncated,
            meta=ChartSpecMeta(row_count_original=n_rows, row_count_rendered=len(data),
                               vde_rule_matched=5 if grouped else 6),
        )

    # ── Rule 7: Scatter ───────────────────────────────────────
    if len(numeric_idxs) == 2 and len(categorical_idxs) == 0 and n_rows >= 10:
        n0, n1 = numeric_idxs[0], numeric_idxs[1]
        cap = 500
        use_rows = rows
        truncated = False
        if n_rows > cap:
            use_rows = random.sample(rows, cap)
            truncated = True
        data = [{"__x": _safe_float(r[n0]), "__y": _safe_float(r[n1]), "__label": ""} for r in use_rows]
        return ChartSpec(
            chart_type="scatter",
            title=generate_chart_title(question, "scatter"),
            x_axis=AxisDef(column=columns[n0], label=normalize_column_label(columns[n0]), type="numeric"),
            y_axis=YAxisDef(
                columns=[columns[n1]],
                labels=[normalize_column_label(columns[n1])],
                unit=infer_unit(columns[n1]),
            ),
            series=[SeriesDef(column=columns[n1], name=normalize_column_label(columns[n1]),
                              data_key="__y", color_index=0)],
            data_transformed=data,
            data_truncated=truncated,
            meta=ChartSpecMeta(row_count_original=n_rows, row_count_rendered=len(data), vde_rule_matched=7),
        )

    # ── Rule 8: Table fallback ────────────────────────────────
    return None
