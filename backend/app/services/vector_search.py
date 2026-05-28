import logging
from typing import List, Dict, Any
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
