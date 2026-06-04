"""domain_embeddings.py — startup service for embedding-based domain fallback."""
import logging
from typing import Dict, List, Optional
from app.services.domain_classifier import DOMAIN_DESCRIPTIONS

logger = logging.getLogger(__name__)
_domain_embeddings: Optional[Dict[str, List[float]]] = None


async def initialize_domain_embeddings() -> Dict[str, List[float]]:
    """Embed all domain descriptions. Cached — runs once per server start."""
    global _domain_embeddings
    if _domain_embeddings is not None:
        return _domain_embeddings

    from app.services.embedding_service import embedding_service
    logger.info("Pre-computing domain embeddings (~200ms one-time cost)...")
    keys = list(DOMAIN_DESCRIPTIONS.keys())
    texts = list(DOMAIN_DESCRIPTIONS.values())
    vectors = await embedding_service.embed_documents(texts)
    _domain_embeddings = dict(zip(keys, vectors))
    logger.info(f"Domain embeddings ready: {keys}")
    return _domain_embeddings


def get_domain_embeddings() -> Optional[Dict[str, List[float]]]:
    """Get cached domain embeddings. Returns None if not initialized."""
    return _domain_embeddings
