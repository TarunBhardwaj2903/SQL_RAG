from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Any


# ── Conversation turn ──────────────────────────────────────────────────────

class ConversationTurn(BaseModel):
    """
    Represents one turn in the conversation history.
    - role: 'user' | 'assistant'
    - content: the user question, or the assistant's plain-text summary
    - sql:     the SQL generated for this turn (assistant turns only, optional)
    """
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)
    sql: Optional[str] = Field(None, max_length=5000)


# ── Existing models ────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    chat_history: List[ConversationTurn] = []   # empty = first message (backward-compat)


class QueryMeta(BaseModel):
    execution_ms: int
    rows_returned: int
    tables_scanned: List[str]
    join_count: int
    confidence: float
    retries_used: int
    rag_retrieved_tables: Optional[List[dict]] = []
    rag_reranked_tables: Optional[List[dict]] = []
    rag_domains_selected: Optional[List[str]] = []
    rag_tables_searched: Optional[int] = None


# ── Chart Spec models (additive — do not touch QueryResponse fields above) ─

class AxisDef(BaseModel):
    """Describes one axis (x or y) of a chart."""
    column: str                # raw column name from result set (used as dataKey)
    label: str                 # normalized human-readable label shown to users
    type: str                  # "categorical" | "temporal" | "numeric"


class YAxisDef(BaseModel):
    """Describes the Y-axis which can have multiple series."""
    columns: List[str]         # raw column names
    labels: List[str]          # normalized display labels
    type: str = "numeric"
    unit: Optional[str] = None # "$", "%", "units", or None


class SeriesDef(BaseModel):
    """Maps one data series to its display properties."""
    column: str                # raw column name
    name: str                  # normalized display label (shown in legend)
    data_key: str              # positional key in data_transformed: __y0, __y1, …
    color_index: int           # index into ACCESSIBLE_PALETTE on the frontend
    y_axis_id: str = "left"    # "left" | "right" (dual-Y-axis support)


class KPIValue(BaseModel):
    """One metric tile for kpi_card / kpi_multi chart types."""
    label: str
    value: Any                 # kept flexible: string or number
    unit: Optional[str] = None


class ChartSpecMeta(BaseModel):
    """Internal VDE diagnostics — not shown to users."""
    row_count_original: int
    row_count_rendered: int
    vde_rule_matched: int
    gap_fill_applied: bool = False


class ChartSpec(BaseModel):
    """
    Full chart specification produced by the Visualization Decision Engine.
    Consumed by ChartRouter on the frontend.
    All data_transformed values use fixed positional keys (__x, __y0…)
    to avoid column-name collisions.
    """
    chart_type: str            # bar|line|pie|donut|scatter|grouped_bar|
                               # kpi_card|kpi_multi|table|empty_state
    title: str                 # generated plain-English title, e.g.
                               # "Top 10 Products by Revenue — Bar Chart"
    x_axis: Optional[AxisDef] = None
    y_axis: Optional[YAxisDef] = None
    series: Optional[List[SeriesDef]] = None
    dual_y_axis: bool = False
    color_scheme: str = "accessible"
    data_transformed: List[dict] = []
    data_truncated: bool = False
    kpi_values: Optional[List[KPIValue]] = None
    meta: Optional[ChartSpecMeta] = None


# ── Response model (chart_spec is additive + optional) ─────────────────────

class QueryResponse(BaseModel):
    sql: str
    summary: str
    columns: List[str]
    rows: List[List[Optional[str]]]
    meta: QueryMeta
    chart_spec: Optional[ChartSpec] = None  # None = table fallback; old clients ignore
