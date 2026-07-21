import time
import socket
import logging
import asyncpg
from typing import List, Tuple, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DNS fallback patch
# ---------------------------------------------------------------------------
# Problem: The router DNS (192.168.0.1) intermittently fails to resolve
# Supabase hostnames. The direct Supabase host is IPv6-only (no IPv4 record),
# and Supabase Supavisor uses SSL SNI to route to the correct tenant —
# so we MUST connect using the hostname (not a raw IP) to preserve SNI.
#
# Solution: Patch socket.getaddrinfo with a wrapper that catches DNS failures
# and returns known-good IPv4 addresses as a fallback. asyncpg (via asyncio)
# calls socket.getaddrinfo internally, so this patch is transparent.
# ---------------------------------------------------------------------------

_ORIGINAL_GETADDRINFO = socket.getaddrinfo

# Known stable IPv4 addresses (verified via Google DNS 8.8.8.8).
_DNS_FALLBACK: dict = {
    "aws-1-ap-northeast-2.pooler.supabase.com": [
        "15.164.188.235",
        "43.202.154.182",
    ],
    "integrate.api.nvidia.com": [
        "75.2.113.119",
        "99.83.136.103",
    ],
}


def _getaddrinfo_with_fallback(host, port, *args, **kwargs):
    """
    Drop-in replacement for socket.getaddrinfo that returns hardcoded IPv4
    addresses when the system resolver fails for known Supabase hostnames.
    """
    try:
        return _ORIGINAL_GETADDRINFO(host, port, *args, **kwargs)
    except OSError as e:
        fallback_ips = _DNS_FALLBACK.get(host)
        if fallback_ips:
            logger.warning(
                f"System DNS failed for '{host}' ({e}). "
                f"Using fallback IPs: {fallback_ips}"
            )
            socktype = args[1] if len(args) > 1 else socket.SOCK_STREAM
            proto = args[2] if len(args) > 2 else 6  # TCP
            return [
                (socket.AF_INET, socktype, proto, "", (ip, port))
                for ip in fallback_ips
            ]
        raise  # Re-raise for any host we don't have a fallback for


# Apply the patch once at import time
socket.getaddrinfo = _getaddrinfo_with_fallback
logger.info("DNS fallback patch applied for Supabase hostnames.")


# ---------------------------------------------------------------------------
# DatabaseService
# ---------------------------------------------------------------------------

class DatabaseService:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def initialize(self, retries: int = 3, delay: float = 2.0):
        """
        Initialize the connection pool with retry logic.

        Uses the DATABASE_URL hostname directly (not a raw IP) so that
        asyncpg correctly sets the TLS SNI header — required by Supabase
        Supavisor to route the connection to the correct project/tenant.
        DNS failures are handled transparently by the getaddrinfo patch above.
        """
        if self.pool:
            return

        last_error = None
        for attempt in range(1, retries + 1):
            try:
                self.pool = await asyncpg.create_pool(
                    settings.DATABASE_URL,
                    min_size=1,
                    max_size=10,
                    command_timeout=30.0,
                    ssl="require",
                )
                logger.info("Database connection pool initialized successfully.")
                return
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Database connection attempt {attempt}/{retries} failed: {e}"
                )
                if attempt < retries:
                    logger.info(f"Retrying in {delay}s...")
                    import asyncio
                    await asyncio.sleep(delay)

        logger.error(
            f"Failed to initialize database pool after {retries} attempts: {last_error}"
        )
        raise last_error

    async def close(self):
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed.")

    async def execute_query(
        self, sql: str
    ) -> Tuple[List[str], List[List[Optional[str]]], int, List[str]]:
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
                records = await conn.fetch(sql)
                execution_ms = int((time.time() - start_time) * 1000)

                if not records:
                    return [], [], execution_ms, []

                columns = list(records[0].keys())

                # Extract PostgreSQL OID type names BEFORE stringification.
                # asyncpg exposes column type info via the statement descriptor.
                # This gives the VDE accurate type signals (int4, timestamp, varchar…)
                # before all values are cast to str() below.
                try:
                    pg_column_types = [
                        records[0].get_column_type(i).name
                        for i in range(len(columns))
                    ]
                except Exception:
                    pg_column_types = ["" for _ in columns]

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
