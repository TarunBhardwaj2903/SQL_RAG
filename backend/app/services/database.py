import time
import logging
import asyncpg
from typing import List, Tuple, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def initialize(self):
        """Initialize the connection pool."""
        if not self.pool:
            try:
                # asyncpg does not support postgresql:// scheme directly in some settings, but standard urls are fine
                # Let's ensure connection string is correct
                db_url = settings.DATABASE_URL
                if db_url.startswith("postgresql://"):
                    # asyncpg handles postgresql:// just fine
                    pass
                self.pool = await asyncpg.create_pool(
                    db_url,
                    min_size=1,
                    max_size=10,
                    command_timeout=30.0
                )
                logger.info("Database connection pool initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize database pool: {e}")
                raise e

    async def close(self):
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed.")

    async def execute_query(self, sql: str) -> Tuple[List[str], List[List[Optional[str]]], int]:
        """
        Execute raw SQL SELECT query.
        Returns:
            columns: list of column names
            rows: list of rows, where each row is a list of stringified values
            execution_ms: execution time in milliseconds
        """
        if not self.pool:
            raise Exception("Database connection pool not initialized")

        start_time = time.time()
        async with self.pool.acquire() as conn:
            try:
                # Execute the query
                records = await conn.fetch(sql)
                execution_ms = int((time.time() - start_time) * 1000)

                if not records:
                    return [], [], execution_ms

                # Extract columns
                columns = list(records[0].keys())

                # Convert records to list of lists (stringified values)
                rows = []
                for record in records:
                    row_data = []
                    for col in columns:
                        val = record[col]
                        row_data.append(str(val) if val is not None else None)
                    rows.append(row_data)

                return columns, rows, execution_ms
            except asyncpg.PostgresError as e:
                logger.error(f"PostgreSQL error: {e} | Query: {sql}")
                raise e

db_service = DatabaseService()

async def get_db_service() -> DatabaseService:
    return db_service
