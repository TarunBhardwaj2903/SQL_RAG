import time
import logging
import asyncpg
from typing import List, Tuple, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def initialize(self, retries: int = 3, delay: float = 2.0):
        """Initialize the connection pool with retry logic."""
        if self.pool:
            return

        last_error = None
        for attempt in range(1, retries + 1):
            try:
                self.pool = await asyncpg.create_pool(
                    settings.DATABASE_URL,
                    min_size=1,
                    max_size=10,
                    command_timeout=30.0
                )
                logger.info("Database connection pool initialized.")
                return
            except Exception as e:
                last_error = e
                logger.warning(f"Database connection attempt {attempt}/{retries} failed: {e}")
                if attempt < retries:
                    logger.info(f"Retrying in {delay}s...")
                    import asyncio
                    await asyncio.sleep(delay)

        logger.error(f"Failed to initialize database pool after {retries} attempts: {last_error}")
        raise last_error

    async def close(self):
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed.")

    async def execute_query(self, sql: str) -> Tuple[List[str], List[List[Optional[str]]], int, List[str]]:
        """
        Execute raw SQL SELECT query.
        Returns:
            columns: list of column names
            rows: list of rows, where each row is a list of stringified values
            execution_ms: execution time in milliseconds
            pg_column_types: list of PostgreSQL OID type names per column (extracted
                             before stringification — used by the VDE for type-safe
                             column classification without losing native type info)
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
                    return [], [], execution_ms, []

                # Extract columns
                columns = list(records[0].keys())

                # Extract PostgreSQL OID type names BEFORE stringification.
                # asyncpg Record exposes column type info via the statement descriptor.
                # This gives the VDE accurate type signals (int4, timestamp, varchar…)
                # before all values are cast to str() below.
                try:
                    pg_column_types = [
                        records[0].get_column_type(i).name
                        for i in range(len(columns))
                    ]
                except Exception:
                    # Fallback: if type extraction fails, use empty strings.
                    # The VDE will fall back to value-pattern matching.
                    pg_column_types = ["" for _ in columns]

                # Convert records to list of lists (stringified values)
                rows = []
                for record in records:
                    row_data = []
                    for col in columns:
                        val = record[col]
                        row_data.append(str(val) if val is not None else None)
                    rows.append(row_data)

                return columns, rows, execution_ms, pg_column_types
            except asyncpg.PostgresError as e:
                logger.error(f"PostgreSQL error: {e} | Query: {sql}")
                raise e

db_service = DatabaseService()

async def get_db_service() -> DatabaseService:
    return db_service
