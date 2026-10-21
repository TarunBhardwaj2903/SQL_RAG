from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional
from app.models.schemas import ChartSpec


# ── Upload response ────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    session_id: str
    filename: str
    row_count: int
    columns: List[str]
    dtypes: Dict[str, str]                 # column → pandas dtype string
    sample_rows: List[List[Any]]               # 5 rows, values as Python primitives


# ── Transformation spec (what the LLM returns) ────────────────────────────────

class AggregateSpec(BaseModel):
    column: str
    func: Literal["sum", "mean", "count", "max", "min"]


class TransformationSpec(BaseModel):
    """
    Strict JSON schema the LLM must return.
    Pydantic validates enums; column names are validated against actual df.columns
    inside pandas_executor.py after the session is loaded.
    """
    operation: Literal[
        "groupby_aggregate",
        "filter_then_aggregate",
        "top_n",
        "cross_tab",
        "time_series",
    ]
    chart_type: Literal["bar", "line", "pie", "donut", "grouped_bar", "scatter"]
    title: str = Field(..., max_length=200)
    insight: str = Field(..., max_length=600)

    # groupby_aggregate / filter_then_aggregate / cross_tab
    group_by: Optional[str] = None
    group_by_2: Optional[str] = None        # cross_tab second dimension
    aggregate: Optional[AggregateSpec] = None

    # filter_then_aggregate
    filter_column: Optional[str] = None
    filter_op: Optional[Literal["eq", "ne", "gt", "lt", "gte", "lte", "contains", "in"]] = None
    filter_value: Optional[Any] = None        # scalar or list for "in"

    # top_n / time_series
    x_column: Optional[str] = None
    y_column: Optional[str] = None

    # time_series resampling
    time_freq: Optional[Literal["D", "W", "M", "Q", "Y"]] = None

    # common
    sort: Optional[Literal["asc", "desc"]] = "desc"
    limit: Optional[int] = Field(default=20, ge=1, le=100)


# ── Analyze request ───────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    session_id: str = Field(..., min_length=36, max_length=36)
    prompt: str = Field(..., min_length=1, max_length=1000)


# ── Analyze response ──────────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    chart_spec: ChartSpec
    insight: str
    rows_analyzed: int
    spec_used: dict                        # raw LLM spec — helpful for debugging
