import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.database import db_service
from app.routers.query import router as query_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting up FastAPI application...")
    try:
        await db_service.initialize()
        
        # Check if RAG is enabled and schema embeddings table is empty
        if settings.RAG_ENABLED and db_service.pool:
            async with db_service.pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM rag.schema_embeddings;")
                if count == 0:
                    logger.info("rag.schema_embeddings is empty. Launching auto-ingestion in the background...")
                    from app.services.schema_ingestor import run_ingestion
                    asyncio.create_task(run_ingestion())
                else:
                    logger.info(f"rag.schema_embeddings table contains {count} tables. Ready.")
                    
    except Exception as e:
        logger.error(f"Startup initialization failed: {e}")
    yield
    # Shutdown actions
    logger.info("Shutting down FastAPI application...")
    await db_service.close()

app = FastAPI(
    title="Text-to-SQL Agent API",
    description="Enterprise Text-to-SQL agent for B2B Revenue Operations using FastAPI and LangChain",
    version="1.0.0",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins. Can be restricted to client port.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(query_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "database": "connected" if db_service.pool else "disconnected"}
