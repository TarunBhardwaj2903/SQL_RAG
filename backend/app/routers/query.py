import logging
import re
from fastapi import APIRouter, Depends, Header, HTTPException
from app.models.schemas import QueryRequest, QueryResponse
from app.services.database import DatabaseService, get_db_service
from app.agents.llm_client import LLMClient
from app.agents.sql_agent import execute_with_self_correction
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Common non-database greetings and phrases
NON_DATABASE_PATTERNS = [
    r'^hi+$', r'^hello+$', r'^hey+$', r'^thanks?$', r'^thank you$',
    r'^ok+$', r'^okay+$', r'^yes+$', r'^no+$', r'^bye+$', r'^goodbye+$',
    r'^test+$', r'^testing+$', r'^help+$'
]

# Keywords that suggest a database intent
DATABASE_KEYWORDS = [
    'show', 'list', 'get', 'find', 'what', 'which', 'who', 'when', 'where',
    'how many', 'how much', 'count', 'total', 'sum', 'average', 'top',
    'sales', 'revenue', 'customer', 'product', 'order', 'employee',
    'department', 'territory', 'vendor', 'purchase', 'price'
]


def is_database_question(question: str, has_history: bool = False) -> bool:
    """
    Check if the question is likely a database query.

    When the user is already in an active conversation (has_history=True),
    any follow-up is assumed to be database-related — short continuations
    like 'break that down by month' or 'show the same for 2023' would
    otherwise be blocked by keyword checks.
    """
    # Active conversation: trust the user — bypass keyword filter entirely
    if has_history:
        return True

    q = question.strip().lower()

    # Too short to be meaningful
    if len(q) < 5:
        return False

    # Explicit non-database phrases (greetings, filler words)
    for pattern in NON_DATABASE_PATTERNS:
        if re.match(pattern, q, re.IGNORECASE):
            return False

    # Must contain at least one database-related keyword
    return any(keyword in q for keyword in DATABASE_KEYWORDS)


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(
    request: QueryRequest,
    db: DatabaseService = Depends(get_db_service)
):
    """
    Accepts a natural language question and an optional chat history,
    translates the question to SQL (with self-correction), executes it
    against PostgreSQL, and returns the query, results, and summary.

    chat_history is forwarded to the LLM so that follow-up questions
    can reference tables, columns, and findings from prior turns.
    """
    try:
        question    = request.question.strip()
        has_history = bool(request.chat_history)

        if not question:
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty. Please ask a question about your database."
            )

        if not is_database_question(question, has_history=has_history):
            raise HTTPException(
                status_code=400,
                detail=(
                    "This doesn't appear to be a database question. "
                    "Please ask questions like:\n"
                    "- 'What are the top 5 products by sales revenue?'\n"
                    "- 'Show me all employees in the Sales department'\n"
                    "- 'List customers with orders over $10,000'"
                )
            )

        llm      = LLMClient()
        response = await execute_with_self_correction(
            question=question,
            db=db,
            llm=llm,
            max_retries=settings.MAX_RETRIES,
            chat_history=request.chat_history,
        )
        return response

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unhandled error in /api/query: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing your query. Please try again."
        )


@router.post("/admin/refresh-schema")
async def refresh_schema_endpoint(x_admin_token: str = Header(None, alias="X-Admin-Token")):
    """
    Manually trigger introspection and embedding of the database schema.
    Requires the X-Admin-Token header to match the ADMIN_SECRET_KEY env variable.
    """
    if not settings.ADMIN_SECRET_KEY or x_admin_token != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: invalid or missing admin token.")
    try:
        from app.services.schema_ingestor import run_ingestion
        count = await run_ingestion()
        return {"status": "success", "message": f"Successfully ingested and embedded {count} tables."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh schema embeddings: {str(e)}"
        )
