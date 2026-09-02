"""
Embedding generation using Sentence Transformers.
Uses the all-MiniLM-L6-v2 model for fast, lightweight embeddings.
"""

from __future__ import annotations

from functools import lru_cache
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

# Load the embedding model once at module level (singleton pattern)
# This avoids reloading the model on every request
_model = None


def get_model() -> SentenceTransformer:
    """Get or initialize the Sentence Transformer model (lazy loading)."""
    global _model
    if _model is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL}...")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("Embedding model loaded successfully!")
    return _model


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts: List of text strings to embed

    Returns:
        List of embedding vectors (each is a list of floats)
    """
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


@lru_cache(maxsize=1024)
def generate_single_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a single text string.
    Used for query embedding during chat.

    Args:
        text: Single text string to embed

    Returns:
        Embedding vector as a list of floats
    """
    model = get_model()
    embedding = model.encode(text, show_progress_bar=False)
    return embedding.tolist()
