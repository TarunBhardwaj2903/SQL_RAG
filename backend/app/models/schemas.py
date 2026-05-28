from pydantic import BaseModel
from typing import List, Optional

class QueryRequest(BaseModel):
    question: str

class QueryMeta(BaseModel):
    execution_ms: int
    rows_returned: int
    tables_scanned: List[str]
    join_count: int
    confidence: float
    retries_used: int
    rag_retrieved_tables: Optional[List[dict]] = []
    rag_reranked_tables: Optional[List[dict]] = []

class QueryResponse(BaseModel):
    sql: str
    summary: str
    columns: List[str]
    rows: List[List[Optional[str]]]
    meta: QueryMeta
