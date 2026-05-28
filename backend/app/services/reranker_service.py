import logging
import httpx
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

class RerankerService:
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY or settings.OPENAI_API_KEY
        # Correct NVIDIA NIM reranking endpoint
        self.base_url = "https://ai.api.nvidia.com/v1/retrieval/nvidia/nv-rerankqa-mistral-4b-v3/reranking"
        self.model = "nvidia/nv-rerankqa-mistral-4b-v3"  # Updated model
        
        if not self.api_key:
            logger.warning("NVIDIA_API_KEY is not set. Reranker service may fail.")

    async def rerank(self, query: str, passages: List[str], top_n: int = 5) -> List[int]:
        """
        Rerank a list of passages for a query using NVIDIA NIM Rerank.
        Returns a sorted list of indices of the most relevant passages.
        """
        if not passages:
            return []
            
        try:
            logger.info(f"Reranking {len(passages)} passages using {self.model}...")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            # Format payload for NVIDIA reranking API (updated format)
            payload = {
                "model": self.model,
                "query": {"text": query},
                "passages": [{"text": p} for p in passages]
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"NVIDIA Rerank API returned status code {response.status_code}: {response.text}")
                    # Return original indices in order as a fallback
                    return list(range(min(len(passages), top_n)))
                
                data = response.json()
                rankings = data.get("rankings", [])
                
                # rankings contains list of {"index": int, "logit": float} sorted by relevance
                sorted_indices = [r["index"] for r in rankings]
                
                # Limit to top_n
                result = sorted_indices[:top_n]
                logger.info(f"Reranking completed. Top indices selected: {result}")
                return result
                
        except Exception as e:
            logger.error(f"Error calling NVIDIA Rerank API: {e}")
            # Fallback: return original order
            return list(range(min(len(passages), top_n)))

reranker_service = RerankerService()
