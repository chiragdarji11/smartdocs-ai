"""
Embedding generation using lightweight ONNX fastembed (or Sentence Transformers fallback).
Super lightweight (<30MB RAM) for cloud deployment on Render free tier.
"""

from __future__ import annotations
from functools import lru_cache
from config import EMBEDDING_MODEL

_model = None
_model_type = None


def get_model():
    """Get or initialize embedding model (fastembed ONNX or sentence-transformers)."""
    global _model, _model_type
    if _model is None:
        try:
            from fastembed import TextEmbedding
            print("Loading ultra-lightweight FastEmbed (ONNX) model...")
            _model = TextEmbedding("BAAI/bge-small-en-v1.5")
            _model_type = "fastembed"
            print("FastEmbed loaded successfully (<30MB RAM)!")
        except Exception as e:
            print(f"FastEmbed not available ({e}), falling back to SentenceTransformer...")
            import os
            os.environ["TOKENIZERS_PARALLELISM"] = "false"
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(EMBEDDING_MODEL, device="cpu")
            _model_type = "st"
            print("SentenceTransformer loaded on CPU!")
    return _model


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text strings."""
    model = get_model()
    if _model_type == "fastembed":
        # Ensure native Python float conversion via .tolist() for ChromaDB compatibility
        return [e.tolist() if hasattr(e, "tolist") else [float(x) for x in e] for e in model.embed(texts)]
    else:
        embeddings = model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()


@lru_cache(maxsize=1024)
def generate_single_embedding(text: str) -> list[float]:
    """Generate an embedding for a single query text."""
    model = get_model()
    if _model_type == "fastembed":
        raw = next(model.embed([text]))
        return raw.tolist() if hasattr(raw, "tolist") else [float(x) for x in raw]
    else:
        embedding = model.encode(text, show_progress_bar=False)
        return embedding.tolist()
