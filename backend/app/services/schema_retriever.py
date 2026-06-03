import logging
import time
from typing import Dict, List, Any, Optional, Tuple
from app.services.database import DatabaseService
from app.config import settings

# Lazy imports to avoid circular dependency
from app.services.embedding_service import embedding_service
from app.services.reranker_service import reranker_service
from app.services.vector_search import find_relevant_schemas_filtered
from app.services.domain_classifier import (
    DOMAIN_TREE,
    classify_domains_by_keywords,
    classify_domains_by_embedding,
    get_tables_for_domains,
)
from app.services.domain_embeddings import get_domain_embeddings

logger = logging.getLogger(__name__)

# Cache schema context in memory
_schema_cache: Optional[str] = None
_cache_time: float = 0.0
CACHE_TTL = 300.0  # 5 minutes cache

async def get_schema_context(db: DatabaseService, bypass_cache: bool = False) -> str:
    """
    Introspect the database and return a formatted string describing the schemas,
    tables, columns, types, and relations. (Brute-force baseline, used as fallback).
    """
    global _schema_cache, _cache_time
    current_time = time.time()

    if _schema_cache and (current_time - _cache_time < CACHE_TTL) and not bypass_cache:
        logger.info("Using cached schema context.")
        return _schema_cache

    logger.info("Introspecting database schemas...")
    if not db.pool:
        raise Exception("Database connection pool not initialized")

    async with db.pool.acquire() as conn:
        # 1. Fetch columns metadata
        columns_query = """
            SELECT table_schema, table_name, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema IN ('humanresources', 'person', 'production', 'purchasing', 'sales')
            ORDER BY table_schema, table_name, ordinal_position;
        """
        columns_records = await conn.fetch(columns_query)

        # 2. Fetch constraints (PKs and FKs)
        constraints_query = """
            SELECT
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name, 
                tc.constraint_type,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
              AND tc.table_schema IN ('humanresources', 'person', 'production', 'purchasing', 'sales');
        """
        constraints_records = await conn.fetch(constraints_query)

    # Organise columns by table
    tables_meta: Dict[tuple, List[Dict[str, Any]]] = {}
    for r in columns_records:
        key = (r['table_schema'].lower(), r['table_name'].lower())
        if key not in tables_meta:
            tables_meta[key] = []
        tables_meta[key].append({
            'column_name': r['column_name'].lower(),
            'data_type': r['data_type'].upper(),
            'nullable': r['is_nullable'] == 'YES',
            'is_pk': False,
            'fks': []
        })

    # Add constraints
    for r in constraints_records:
        key = (r['table_schema'].lower(), r['table_name'].lower())
        if key not in tables_meta:
            continue
        col_name = r['column_name'].lower()
        const_type = r['constraint_type']

        # Find the column meta
        for col in tables_meta[key]:
            if col['column_name'] == col_name:
                if const_type == 'PRIMARY KEY':
                    col['is_pk'] = True
                elif const_type == 'FOREIGN KEY' and r['foreign_table_name']:
                    col['fks'].append((
                        r['foreign_table_schema'].lower(),
                        r['foreign_table_name'].lower(),
                        r['foreign_column_name'].lower()
                    ))

    # Format the schema context string
    lines = []
    lines.append("PostgreSQL Database Schema Information:")
    lines.append("Only query the tables and columns listed below. Always prefix table names with their schema (e.g. Sales.Customer).")
    lines.append("")

    for (schema, table), cols in sorted(tables_meta.items()):
        lines.append(f"TABLE: {schema}.{table}")
        
        # Write primary keys
        pks = [c['column_name'] for c in cols if c['is_pk']]
        if pks:
            lines.append(f"  Primary Key: {', '.join(pks)}")

        # Write columns
        for c in cols:
            pk_str = " (PK)" if c['is_pk'] else ""
            null_str = " (NULL)" if c['nullable'] else " (NOT NULL)"
            lines.append(f"  - {c['column_name']}: {c['data_type']}{pk_str}{null_str}")
            
            # Write foreign keys
            for fs, ft, fc in c['fks']:
                lines.append(f"    FK: {schema}.{table}.{c['column_name']} -> {fs}.{ft}.{fc}")
        
        lines.append("")

    schema_str = "\n".join(lines)
    _schema_cache = schema_str
    _cache_time = current_time
    return schema_str

async def get_relevant_schema_context(
    db: DatabaseService,
    user_query: str
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]], List[str], int]:
    """
    Domain-aware RAG-based schema retrieval:
    0. Domain classification (keyword first, embedding fallback).
    1. Call embedding API for user query.
    2. Vector search in pgvector table (filtered by domain) to get top RAG_CANDIDATE_COUNT candidates.
    3. Zero-results retry with full table set if needed.
    4. Select top RAG_TOP_K tables.
    5. Compile the schema string of selected tables.
    Returns:
        schema_text: formatted string containing only the top relevant schemas.
        retrieved_tables: details of top vector-search matched tables.
        reranked_tables: details of top reranked tables.
        domains: list of selected domains.
        tables_searched: number of tables in the search pool.
    """
    # Fallback checking
    if not settings.RAG_ENABLED:
        logger.info("RAG is disabled. Falling back to full schema context.")
        full_context = await get_schema_context(db)
        return full_context, [], [], list(DOMAIN_TREE.keys()), 87

    try:
        # Stage 0: Domain classification (keyword first, embed fallback)
        domains = []
        table_filter = None
        query_vector = None
        
        if settings.DOMAIN_TREE_ENABLED:
            domains = classify_domains_by_keywords(user_query)
            if not domains:
                # Embed fallback — reuse the query vector computed below
                query_vector = await embedding_service.embed_query(user_query)
                domain_embs = get_domain_embeddings()
                if domain_embs:
                    domains = await classify_domains_by_embedding(query_vector, domain_embs)
                else:
                    domains = list(DOMAIN_TREE.keys())
            
            table_filter = get_tables_for_domains(domains)
            logger.info(f"Domains: {domains} → {len(table_filter)} tables in scope")
        else:
            domains = list(DOMAIN_TREE.keys())

        # Step 1: Embed query (if not already done for fallback)
        if query_vector is None:
            query_vector = await embedding_service.embed_query(user_query)
        
        if not query_vector:
            raise Exception("Failed to generate embedding for query.")

        # Step 2: Filtered vector search
        candidates = await find_relevant_schemas_filtered(
            db, 
            query_vector, 
            top_k=settings.RAG_CANDIDATE_COUNT,
            table_filter=table_filter
        )

        # Stage 2: Zero-results safety retry (new in v2)
        if not candidates and table_filter:
            logger.warning(f"0 results for domains={domains}. Retrying unfiltered.")
            candidates = await find_relevant_schemas_filtered(
                db, 
                query_vector,
                top_k=settings.RAG_CANDIDATE_COUNT,
                table_filter=None
            )
            domains = list(DOMAIN_TREE.keys())
            table_filter = None
        
        if not candidates:
            logger.warning("No schema candidates found in vector search. Falling back to full schema.")
            full_context = await get_schema_context(db)
            return full_context, [], [], list(DOMAIN_TREE.keys()), 87

        # Formulate candidates info for debugging
        retrieved_tables = [
            {"name": c["full_name"], "score": round(c["similarity"], 4)}
            for c in candidates
        ]

        # Step 3: Simply take the top RAG_TOP_K candidates from vector search
        logger.info(f"Skipping reranking. Using top {settings.RAG_TOP_K} vector search results directly.")
        selected_candidates = candidates[:settings.RAG_TOP_K]
        
        # Formulate reranked info for debugging
        reranked_tables = [
            {"name": c["full_name"], "score": round(c["similarity"], 4)}
            for c in selected_candidates
        ]

        # Step 4: Build schema context string from selected tables
        lines = []
        lines.append("PostgreSQL Database Schema Information:")
        lines.append("Only query the tables and columns listed below. Always prefix table names with their schema (e.g. Sales.Customer).")
        lines.append("")
        
        for c in selected_candidates:
            lines.append(c["schema_text"])
            lines.append("")

        schema_str = "\n".join(lines)
        
        tables_searched = len(table_filter) if table_filter else 87
        
        logger.info(f"RAG successfully selected {len(selected_candidates)} tables out of {len(candidates)} candidates.")
        return schema_str, retrieved_tables, reranked_tables, domains, tables_searched

    except Exception as e:
        logger.error(f"Domain-aware RAG failed: {e}. Falling back to full schema.")
        full_context = await get_schema_context(db)
        return full_context, [], [], list(DOMAIN_TREE.keys()), 87

