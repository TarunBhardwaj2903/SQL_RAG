import logging
from typing import List
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY or settings.OPENAI_API_KEY
        # Correct NVIDIA NIM base URL
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.model = settings.NVIDIA_EMBED_MODEL
        
        if not self.api_key:
            logger.warning("NVIDIA_API_KEY is not set. Embedding service may fail.")
            
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

    async def embed_query(self, text: str) -> List[float]:
        """
        Embed a single text query.
        """
        try:
            logger.info(f"Generating embedding for query: '{text[:30]}...' using model {self.model}")
            response = await self.client.embeddings.create(
                input=[text],
                model=self.model,
                extra_body={"input_type": "query"}
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise e

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of document strings.
        """
        try:
            logger.info(f"Generating embeddings for {len(texts)} documents...")
            response = await self.client.embeddings.create(
                input=texts,
                model=self.model,
                extra_body={"input_type": "passage"}
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error(f"Error generating document embeddings: {e}")
            raise e

embedding_service = EmbeddingService()
