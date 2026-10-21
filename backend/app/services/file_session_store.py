import time
import asyncio
import logging
from typing import Dict, List, Any
import pandas as pd
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_SESSIONS: Dict[str, dict] = {}
_TTL_SECONDS = 1800  # 30 minutes


def create_session(
    session_id: str,
    df: pd.DataFrame,
    filename: str,
    columns: List[str],
    dtypes: Dict[str, str],
    sample_rows: List[List[Any]],
    row_count: int
) -> None:
    _SESSIONS[session_id] = {
        "df": df,
        "filename": filename,
        "columns": columns,
        "dtypes": dtypes,
        "sample_rows": sample_rows,
        "row_count": row_count,
        "created_at": time.time(),
    }
    logger.info(f"File session created: {session_id} ({filename}, {row_count} rows)")


def get_session(session_id: str) -> dict:
    s = _SESSIONS.get(session_id)
    if not s:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired. Please re-upload your file."
        )
    if time.time() - s["created_at"] > _TTL_SECONDS:
        _SESSIONS.pop(session_id, None)
        raise HTTPException(
            status_code=404,
            detail="Session expired (30 minute limit). Please re-upload your file."
        )
    return s


async def start_cleanup_loop():
    """Runs as a background asyncio task; evicts expired sessions every 5 minutes."""
    logger.info("Starting file session store cleanup loop...")
    while True:
        try:
            await asyncio.sleep(300)
            now = time.time()
            expired = [k for k, v in _SESSIONS.items() if now - v["created_at"] > _TTL_SECONDS]
            for k in expired:
                _SESSIONS.pop(k, None)
                logger.info(f"Evicted expired file session: {k}")
        except asyncio.CancelledError:
            logger.info("File session cleanup loop stopped.")
            break
        except Exception as e:
            logger.error(f"Error in session cleanup loop: {e}")
