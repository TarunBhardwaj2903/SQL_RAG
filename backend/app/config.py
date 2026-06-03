from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., validation_alias="DATABASE_URL")
    OPENAI_API_KEY: str = Field("your_openai_api_key_here", validation_alias="OPENAI_API_KEY")
    OPENAI_API_BASE: str = ""
    OPENAI_MODEL: str = "meta/llama-3.3-70b-instruct"
    MAX_RETRIES: int = 3
    LOG_LEVEL: str = "INFO"

    # RAG Settings
    NVIDIA_API_KEY: str = Field("", validation_alias="NVIDIA_API_KEY")
    NVIDIA_EMBED_MODEL: str = "nvidia/llama-nemotron-embed-1b-v2"
    NVIDIA_RERANK_MODEL: str = "nvidia/nv-rerankqa-mistral-4b-v3"
    RAG_CANDIDATE_COUNT: int = 10
    RAG_TOP_K: int = 5
    RAG_ENABLED: bool = True
    
    # Schema Tree Navigation
    DOMAIN_TREE_ENABLED: bool = True

    # CORS — set this to your Vercel frontend URL in production
    # e.g. https://sql-rag.vercel.app
    FRONTEND_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
