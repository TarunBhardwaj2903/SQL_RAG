import logging
import re
from fastapi import HTTPException
import asyncpg
from typing import List
from app.config import settings
from app.models.schemas import QueryResponse, QueryMeta
from app.services.database import DatabaseService
from app.services.schema_retriever import get_relevant_schema_context
from app.utils.sql_guard import validate_sql
from app.agents.llm_client import LLMClient
from app.services.visualization_engine import build_chart_spec

logger = logging.getLogger(__name__)


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
    max_retries: int = 3
) -> QueryResponse:
    """
    Core self-correcting execution loop:
    1. Retrieve the relevant database schemas using 3-stage RAG.
    2. Request LLM to write SQL.
    3. Validate SQL against DDL/DML injection.
    4. Run query against database.
    5. On error, feed error back to LLM, obtain fixed SQL, and retry.
    6. Summarize results (isolated try/except — failure returns fallback string).
    7. Build chart spec (isolated try/except — failure returns None / table fallback).
    8. Return final payload.
    """
    # 1. Fetch schema context
    schema_context, retrieved_tables, reranked_tables, domains, tables_searched = \
        await get_relevant_schema_context(db, question)

    # 2. Initial SQL generation
    sql = await llm.generate_sql(question, schema_context)

    retries = 0
    last_error = None
    columns: List[str] = []
    rows: List[List] = []
    execution_ms = 0
    pg_column_types: List[str] = []

    while retries <= max_retries:
        # 3. Security check
        guard_result = validate_sql(sql)
        if not guard_result.is_safe:
            logger.warning(f"SQL Blocked: {guard_result.reason} | Query: {sql}")
            raise HTTPException(
                status_code=400,
                detail=f"Blocked query generation: {guard_result.reason}"
            )

        # 4. Execute query — now unpacks 4-tuple including pg_column_types
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

            # 5. Feed error back to LLM to self-correct
            sql = await llm.fix_sql(sql, last_error, schema_context)

    # 6. Generate summary — isolated: NIM timeout must not kill chart + table
    try:
        summary = await llm.generate_summary(question, sql, columns, rows)
    except Exception as e:
        logger.warning(f"Summary generation failed (data still returned): {e}")
        summary = "Summary unavailable — results retrieved successfully."

    # 7. Build chart spec — isolated: VDE error must not kill the response
    chart_spec = None
    try:
        chart_spec = build_chart_spec(question, columns, rows, pg_column_types)
    except Exception as e:
        logger.warning(f"VDE error (chart_spec set to None): {e}")
        chart_spec = None

    # 8. Extract tables and joins, compute confidence
    tables_scanned = extract_tables(sql)
    join_count = len(re.findall(r"\bJOIN\b", sql, re.IGNORECASE))
    confidence = max(0.95 - (retries * 0.15), 0.2)

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
