import logging
from typing import Tuple, List, Dict, Any, Optional, Union
import pandas as pd
from fastapi import HTTPException

from app.models.file_schemas import TransformationSpec
from app.models.schemas import (
    ChartSpec, AxisDef, YAxisDef, SeriesDef, ChartSpecMeta
)

logger = logging.getLogger(__name__)


def _validate_columns(spec: TransformationSpec, df: pd.DataFrame):
    """Raise HTTPException 422 if any specified column is missing from df.columns."""
    cols_to_check = [
        c for c in [
            spec.group_by, spec.group_by_2, spec.filter_column,
            spec.x_column, spec.y_column,
            spec.aggregate.column if spec.aggregate else None
        ] if c is not None
    ]
    missing = [c for c in cols_to_check if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Requested column(s) not found in uploaded file: {missing}. Available columns: {list(df.columns)}"
        )


def _coerce_filter_value(df: pd.DataFrame, col: str, val: Any) -> Any:
    """Cast val to the same dtype as df[col] before comparison."""
    if val is None:
        return val
    dtype = df[col].dtype
    if pd.api.types.is_numeric_dtype(dtype):
        try:
            return [float(v) for v in val] if isinstance(val, list) else float(val)
        except (ValueError, TypeError):
            return val
    if pd.api.types.is_datetime64_any_dtype(dtype):
        try:
            return pd.Timestamp(val)
        except Exception:
            return val
    return str(val) if not isinstance(val, list) else [str(v) for v in val]


def execute_transformation(
    spec: TransformationSpec,
    df: pd.DataFrame
) -> Tuple[pd.DataFrame, str, Union[str, List[str]], str]:
    """
    Executes the TransformationSpec using pandas on the input DataFrame.

    Returns:
        (result_df, x_col, y_col_or_cols, final_chart_type)
    """
    _validate_columns(spec, df)
    chart_type = spec.chart_type

    # 1. groupby_aggregate & filter_then_aggregate helper
    def _do_groupby_agg(source_df: pd.DataFrame, group_col: str, agg_spec) -> Tuple[pd.DataFrame, str, str]:
        if agg_spec is None:
            raise HTTPException(status_code=422, detail="aggregate specification is required for groupby operations.")
        agg_col = agg_spec.column
        agg_func = agg_spec.func

        res = (
            source_df.groupby(group_col, as_index=False)[agg_col]
            .agg(agg_func)
            .sort_values(agg_col, ascending=(spec.sort == "asc"))
            .head(spec.limit or 20)
        )
        return res, group_col, agg_col

    # --- Operation routing ---
    if spec.operation == "groupby_aggregate":
        if not spec.group_by:
            raise HTTPException(status_code=422, detail="group_by is required for groupby_aggregate.")
        res_df, x_col, y_col = _do_groupby_agg(df, spec.group_by, spec.aggregate)

    elif spec.operation == "filter_then_aggregate":
        if not spec.filter_column or not spec.filter_op:
            raise HTTPException(status_code=422, detail="filter_column and filter_op are required for filter_then_aggregate.")
        val = _coerce_filter_value(df, spec.filter_column, spec.filter_value)
        col_series = df[spec.filter_column]

        ops = {
            "eq": lambda s, v: s == v,
            "ne": lambda s, v: s != v,
            "gt": lambda s, v: s > v,
            "lt": lambda s, v: s < v,
            "gte": lambda s, v: s >= v,
            "lte": lambda s, v: s <= v,
            "contains": lambda s, v: s.astype(str).str.contains(str(v), case=False, na=False),
            "in": lambda s, v: s.isin(v if isinstance(v, list) else [v]),
        }
        filter_fn = ops.get(spec.filter_op)
        if not filter_fn:
            raise HTTPException(status_code=422, detail=f"Unsupported filter operator: {spec.filter_op}")
        
        filtered_df = df[filter_fn(col_series, val)]
        if filtered_df.empty:
            logger.warning(f"Filter produced 0 rows ({spec.filter_column} {spec.filter_op} {val})")
            return pd.DataFrame(), spec.group_by or "", spec.aggregate.column if spec.aggregate else "", chart_type

        res_df, x_col, y_col = _do_groupby_agg(filtered_df, spec.group_by, spec.aggregate)

    elif spec.operation == "top_n":
        if not spec.x_column or not spec.y_column:
            raise HTTPException(status_code=422, detail="x_column and y_column are required for top_n.")
        res_df = (
            df[[spec.x_column, spec.y_column]]
            .dropna()
            .drop_duplicates()
            .sort_values(spec.y_column, ascending=(spec.sort == "asc"))
            .head(spec.limit or 10)
        )
        x_col, y_col = spec.x_column, spec.y_column

    elif spec.operation == "cross_tab":
        if not spec.group_by or not spec.group_by_2 or not spec.aggregate:
            raise HTTPException(status_code=422, detail="group_by, group_by_2, and aggregate are required for cross_tab.")
        
        unique_count = df[spec.group_by_2].nunique()
        if unique_count > 10:
            raise HTTPException(
                status_code=422,
                detail=f"cross_tab rejected: column '{spec.group_by_2}' has {unique_count} unique values (maximum allowed is 10)."
            )

        res_df = pd.crosstab(
            df[spec.group_by],
            df[spec.group_by_2],
            values=df[spec.aggregate.column],
            aggfunc=spec.aggregate.func
        ).fillna(0).reset_index()

        chart_type = "grouped_bar"  # Force grouped_bar
        x_col = spec.group_by
        y_col = [c for c in res_df.columns if c != spec.group_by]

    elif spec.operation == "time_series":
        if not spec.x_column or not spec.y_column:
            raise HTTPException(status_code=422, detail="x_column and y_column are required for time_series.")
        
        temp_df = df.copy()
        temp_df[spec.x_column] = pd.to_datetime(temp_df[spec.x_column], errors="coerce")
        temp_df = temp_df.dropna(subset=[spec.x_column]).sort_values(spec.x_column)

        if temp_df.empty:
            return pd.DataFrame(), spec.x_column, spec.y_column, "line"

        agg_func = spec.aggregate.func if spec.aggregate else "sum"
        
        if spec.time_freq:
            res_df = (
                temp_df.set_index(spec.x_column)[spec.y_column]
                .resample(spec.time_freq)
                .agg(agg_func)
                .reset_index()
            )
        else:
            res_df = (
                temp_df.groupby(spec.x_column, as_index=False)[spec.y_column]
                .agg(agg_func)
            )

        res_df[spec.x_column] = res_df[spec.x_column].dt.strftime("%Y-%m-%d")
        chart_type = "line"  # Force line
        x_col, y_col = spec.x_column, spec.y_column

    else:
        raise HTTPException(status_code=422, detail=f"Unsupported operation: {spec.operation}")

    return res_df, x_col, y_col, chart_type


def build_chart_spec(
    spec: TransformationSpec,
    result_df: pd.DataFrame,
    x_col: str,
    y_col_or_cols: Union[str, List[str]],
    final_chart_type: str,
    original_row_count: int
) -> ChartSpec:
    """
    Adapts the pandas result DataFrame into a frontend-compatible ChartSpec model.
    Handles key formats for all chart types (bar/line/grouped_bar vs pie/donut).
    """
    if result_df.empty:
        return ChartSpec(
            chart_type="empty_state",
            title=spec.title,
            data_transformed=[],
            data_truncated=False,
            meta=ChartSpecMeta(
                row_count_original=original_row_count,
                row_count_rendered=0,
                vde_rule_matched=0,
                gap_fill_applied=False,
            )
        )

    meta = ChartSpecMeta(
        row_count_original=original_row_count,
        row_count_rendered=len(result_df),
        vde_rule_matched=0,
        gap_fill_applied=False,
    )

    # --- Pie / Donut (C1 fix: Uses __name / __value) ---
    if final_chart_type in ("pie", "donut"):
        data_transformed = [
            {"__name": str(row[x_col]), "__value": float(row[y_col_or_cols]) if pd.notnull(row[y_col_or_cols]) else 0.0}
            for _, row in result_df.iterrows()
        ]
        return ChartSpec(
            chart_type=final_chart_type,
            title=spec.title,
            data_transformed=data_transformed,
            data_truncated=(len(result_df) < original_row_count),
            meta=meta
        )

    # --- Grouped Bar (Multiple Y series) ---
    if final_chart_type == "grouped_bar" and isinstance(y_col_or_cols, list):
        data_transformed = []
        for _, row in result_df.iterrows():
            item = {"__x": str(row[x_col])}
            for i, yc in enumerate(y_col_or_cols):
                val = row[yc]
                item[f"__y{i}"] = float(val) if pd.notnull(val) else 0.0
            data_transformed.append(item)

        series = [
            SeriesDef(
                column=str(yc),
                name=str(yc),
                data_key=f"__y{i}",
                color_index=i % 8,
                y_axis_id="left"
            )
            for i, yc in enumerate(y_col_or_cols)
        ]

        x_axis = AxisDef(column=x_col, label=str(x_col), type="categorical")
        y_axis = YAxisDef(columns=[str(c) for c in y_col_or_cols], labels=[str(c) for c in y_col_or_cols])

        return ChartSpec(
            chart_type="grouped_bar",
            title=spec.title,
            x_axis=x_axis,
            y_axis=y_axis,
            series=series,
            data_transformed=data_transformed,
            data_truncated=(len(result_df) < original_row_count),
            meta=meta
        )

    # --- Standard Single Series (Bar / Line / Scatter) ---
    y_col = str(y_col_or_cols)
    data_transformed = [
        {"__x": str(row[x_col]), "__y0": float(row[y_col]) if pd.notnull(row[y_col]) else 0.0}
        for _, row in result_df.iterrows()
    ]
    series = [
        SeriesDef(
            column=y_col,
            name=y_col,
            data_key="__y0",
            color_index=0,
            y_axis_id="left"
        )
    ]
    axis_type = "temporal" if final_chart_type == "line" else "categorical"
    x_axis = AxisDef(column=x_col, label=x_col, type=axis_type)
    y_axis = YAxisDef(columns=[y_col], labels=[y_col])

    return ChartSpec(
        chart_type=final_chart_type,
        title=spec.title,
        x_axis=x_axis,
        y_axis=y_axis,
        series=series,
        data_transformed=data_transformed,
        data_truncated=(len(result_df) < original_row_count),
        meta=meta
    )
