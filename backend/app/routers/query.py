from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import QueryRequest, QueryResponse
from app.services.database import DatabaseService, get_db_service
from app.agents.llm_client import LLMClient
from app.agents.sql_agent import execute_with_self_correction
from app.config import settings
import re

router = APIRouter()

# Common non-database greetings and phrases
NON_DATABASE_PATTERNS = [
    r'^hi+$', r'^hello+$', r'^hey+$', r'^thanks?$', r'^thank you$',
    r'^ok+$', r'^okay+$', r'^yes+$', r'^no+$', r'^bye+$', r'^goodbye+$',
    r'^test+$', r'^testing+$', r'^help+$'
]

def is_database_question(question: str) -> bool:
    """Check if the question is likely a database query."""
    q = question.strip().lower()
    
    # Check if it's too short (less than 5 characters)
    if len(q) < 5:
        return False
    
    # Check against non-database patterns
    for pattern in NON_DATABASE_PATTERNS:
        if re.match(pattern, q, re.IGNORECASE):
            return False
    
    # Check if it contains database-related keywords
    database_keywords = [
        'show', 'list', 'get', 'find', 'what', 'which', 'who', 'when', 'where',
        'how many', 'how much', 'count', 'total', 'sum', 'average', 'top',
        'sales', 'revenue', 'customer', 'product', 'order', 'employee',
        'department', 'territory', 'vendor', 'purchase', 'price'
    ]
    
    return any(keyword in q for keyword in database_keywords)

@router.post("/query", response_model=QueryResponse)
async def query_endpoint(
    request: QueryRequest,
    db: DatabaseService = Depends(get_db_service)
):
    """
    Endpoint that takes a natural language string, translates it to SQL,
    runs it against PostgreSQL with a self-correcting loop, and returns
    the query, results, and summary.
    """
    try:
        # Validate input
        question = request.question.strip()
        
        if not question:
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty. Please ask a question about your database."
            )
        
        # Check if it's a database question
        if not is_database_question(question):
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
        
        llm = LLMClient()
        response = await execute_with_self_correction(
            question=question,
            db=db,
            llm=llm,
            max_retries=settings.MAX_RETRIES
        )
        return response
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the query: {str(e)}"
        )

@router.post("/admin/refresh-schema")
async def refresh_schema_endpoint():
    """
    Manually trigger introspection and embedding of the database schema.
    """
    try:
        from app.services.schema_ingestor import run_ingestion
        count = await run_ingestion()
        return {"status": "success", "message": f"Successfully ingested and embedded {count} tables."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh schema embeddings: {str(e)}"
        )
