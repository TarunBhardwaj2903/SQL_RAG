import logging
import re
from fastapi import HTTPException
import asyncpg
from typing import List, Optional
from app.config import settings
from app.models.schemas import QueryResponse, QueryMeta, ConversationTurn
from app.services.database import DatabaseService
from app.services.schema_retriever import get_relevant_schema_context
from app.utils.sql_guard import validate_sql
from app.agents.llm_client import LLMClient
from app.services.visualization_engine import build_chart_spec

logger = logging.getLogger(__name__)

# Maximum number of prior conversation turns forwarded to the LLM.
# Prevents context-window overflow for very long sessions sent directly via the API.
MAX_HISTORY_TURNS = 10


def extract_tables(sql: str) -> List[str]:
    """Basic extraction of table names from a SELECT query."""
    matches = re.findall(r"\b(?:FROM|JOIN)\s+([a-zA-Z0-9_\.]+)", sql, re.IGNORECASE)
    tables = []
    for m in matches:
        m_clean = m.strip().lower()
        if m_clean and m_clean not in ("select", "left", "right", "inner", "outer", "cross", "full", "lateral"):
            if m_clean not in tables:
                tables.append(m_clean)
    return tables


async def execute_with_self_correction(
    question: str,
    db: DatabaseService,
    llm: LLMClient,
    max_retries: int = 3,
    chat_history: Optional[List[ConversationTurn]] = None,
) -> QueryResponse:
    """
    Core self-correcting execution loop:
    1. Trim history to MAX_HISTORY_TURNS (backend depth guard).
    2. Retrieve the relevant database schemas using 3-stage RAG.
    3. Request LLM to write SQL, passing trimmed history for follow-up context.
    4. Validate SQL against DDL/DML injection.
    5. Run query against database.
    6. On error, feed error back to LLM to self-correct (no history needed here).
    7. Summarize results with history so the summary can reference prior findings.
    8. Build chart spec.
    9. Return final payload.
    """
    # 1. Backend history depth guard
    if chat_history is None:
        chat_history = []
    chat_history = chat_history[-MAX_HISTORY_TURNS:]

    # 2. Fetch schema context
    schema_context, retrieved_tables, reranked_tables, domains, tables_searched = \
        await get_relevant_schema_context(db, question)

    # 3. Initial SQL generation — passes history for follow-up awareness
    sql = await llm.generate_sql(question, schema_context, chat_history)

    retries = 0
    last_error = None
    columns: List[str] = []
    rows: List[List] = []
    execution_ms = 0
    pg_column_types: List[str] = []

    while retries <= max_retries:
        # 4. Security check
        guard_result = validate_sql(sql)
        if not guard_result.is_safe:
            logger.warning(f"SQL Blocked: {guard_result.reason} | Query: {sql}")
            raise HTTPException(
                status_code=400,
                detail=f"Blocked query generation: {guard_result.reason}"
            )

        # 5. Execute query
        try:
            columns, rows, execution_ms, pg_column_types = await db.execute_query(sql)
            logger.info(f"Query executed successfully on attempt {retries}")
            break
        except asyncpg.PostgresError as e:
            last_error = str(e)
            retries += 1
            logger.warning(f"Query attempt {retries - 1} failed: {last_error}")

            if retries > max_retries:
                logger.error(f"Query failed after {max_retries} correction attempts.")
                raise HTTPException(
                    status_code=500,
                    detail=f"PostgreSQL Query failed after {max_retries} correction attempts. Error: {last_error}"
                )

            # 6. Self-correct — history not needed, only schema + error message
            sql = await llm.fix_sql(sql, last_error, schema_context)

    # 7. Generate summary — passes history so it can reference prior findings
    try:
        summary = await llm.generate_summary(question, sql, columns, rows, chat_history)
    except Exception as e:
        logger.warning(f"Summary generation failed (data still returned): {e}")
        summary = "Summary unavailable — results retrieved successfully."

    # 8. Build chart spec — isolated from history; VDE works on raw data only
    chart_spec = None
    try:
        chart_spec = build_chart_spec(question, columns, rows, pg_column_types)
    except Exception as e:
        logger.warning(f"VDE error (chart_spec set to None): {e}")
        chart_spec = None

    # 9. Compute metadata
    tables_scanned = extract_tables(sql)
    join_count     = len(re.findall(r"\bJOIN\b", sql, re.IGNORECASE))
    confidence     = max(0.95 - (retries * 0.15), 0.2)

    return QueryResponse(
        sql=sql,
        summary=summary,
        columns=columns,
        rows=rows,
        meta=QueryMeta(
            execution_ms=execution_ms,
            rows_returned=len(rows),
            tables_scanned=tables_scanned,
            join_count=join_count,
            confidence=confidence,
            retries_used=retries,
            rag_retrieved_tables=retrieved_tables,
            rag_reranked_tables=reranked_tables,
            rag_domains_selected=domains,
            rag_tables_searched=tables_searched
        ),
        chart_spec=chart_spec,
    )
