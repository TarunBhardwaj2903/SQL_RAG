import logging
from typing import List, Dict, Any, Optional
from app.services.database import DatabaseService

logger = logging.getLogger(__name__)

async def find_relevant_schemas(db: DatabaseService, query_embedding: List[float], top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Search database for relevant table schemas based on query embedding.
    Returns list of dicts with keys: schema_name, table_name, full_name, schema_text, similarity.
    """
    if not db.pool:
        raise Exception("Database connection pool not initialized")
        
    try:
        logger.info(f"Running vector search in Supabase for top {top_k} similar tables...")
        async with db.pool.acquire() as conn:
            # Call the rag.match_schemas function with the vector string cast
            records = await conn.fetch(
                "SELECT schema_name, table_name, schema_text, similarity FROM rag.match_schemas($1::extensions.vector, $2)",
                str(query_embedding), top_k
            )
            
            results = []
            for r in records:
                results.append({
                    "schema_name": r["schema_name"],
                    "table_name": r["table_name"],
                    "full_name": f"{r['schema_name']}.{r['table_name']}",
                    "schema_text": r["schema_text"],
                    "similarity": r["similarity"]
                })
                
            logger.info(f"Vector search returned {len(results)} tables.")
            return results
    except Exception as e:
        logger.error(f"Error during vector search in Supabase: {e}")
        # Return empty list as a fallback
        return []


async def find_relevant_schemas_filtered(
    db: DatabaseService,
    query_embedding: List[float],
    top_k: int = 10,
    table_filter: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Vector search with optional domain filter.
    If table_filter is provided, only searches within those tables.
    """
    if not db.pool:
        raise Exception("Database connection pool not initialized")
    
    try:
        async with db.pool.acquire() as conn:
            if table_filter:
                logger.info(f"Running filtered vector search for {len(table_filter)} tables...")
                records = await conn.fetch(
                    "SELECT schema_name, table_name, schema_text, similarity "
                    "FROM rag.match_schemas($1::extensions.vector, $2, $3)",
                    str(query_embedding), top_k, table_filter
                )
            else:
                logger.info(f"Running vector search in Supabase for top {top_k} similar tables...")
                records = await conn.fetch(
                    "SELECT schema_name, table_name, schema_text, similarity "
                    "FROM rag.match_schemas($1::extensions.vector, $2)",
                    str(query_embedding), top_k
                )
            
            results = []
            for r in records:
                results.append({
                    "schema_name": r["schema_name"],
                    "table_name": r["table_name"],
                    "full_name": f"{r['schema_name']}.{r['table_name']}",
                    "schema_text": r["schema_text"],
                    "similarity": r["similarity"]
                })
            
            logger.info(f"Vector search returned {len(results)} tables.")
            return results
    except Exception as e:
        logger.error(f"Filtered vector search error: {e}")
        return []


async def find_relevant_schemas_filtered(
    db: DatabaseService,
    query_embedding: List[float],
    top_k: int = 10,
    table_filter: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Vector search with optional domain filter.
    If table_filter is provided, only searches within those tables.
    Otherwise, searches all tables (same as find_relevant_schemas).
    """
    if not db.pool:
        raise Exception("Database connection pool not initialized")
    
    try:
        async with db.pool.acquire() as conn:
            if table_filter:
                logger.info(f"Running filtered vector search for {len(table_filter)} tables, top {top_k}...")
                records = await conn.fetch(
                    "SELECT schema_name, table_name, schema_text, similarity "
                    "FROM rag.match_schemas($1::extensions.vector, $2, $3)",
                    str(query_embedding), top_k, table_filter
                )
            else:
                logger.info(f"Running unfiltered vector search for top {top_k} tables...")
                records = await conn.fetch(
                    "SELECT schema_name, table_name, schema_text, similarity "
                    "FROM rag.match_schemas($1::extensions.vector, $2)",
                    str(query_embedding), top_k
                )
            
            results = []
            for r in records:
                results.append({
                    "schema_name": r["schema_name"],
                    "table_name": r["table_name"],
                    "full_name": f"{r['schema_name']}.{r['table_name']}",
                    "schema_text": r["schema_text"],
                    "similarity": r["similarity"]
                })
            
            logger.info(f"Vector search returned {len(results)} tables.")
            return results
    except Exception as e:
        logger.error(f"Filtered vector search error: {e}")
        return []
