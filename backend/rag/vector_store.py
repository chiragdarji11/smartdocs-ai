"""
ChromaDB vector store operations.
Handles storing, querying, and deleting document chunk embeddings.
"""

from __future__ import annotations

import chromadb
from config import VECTOR_DB_DIR

# Initialize ChromaDB client with persistent storage
_client = None


def get_client() -> chromadb.PersistentClient:
    """Get or initialize the ChromaDB persistent client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=VECTOR_DB_DIR)
    return _client


def get_collection(user_id: int) -> chromadb.Collection:
    """
    Get or create a ChromaDB collection for a specific user.
    Each user has their own collection to keep documents separate.
    """
    client = get_client()
    return client.get_or_create_collection(
        name=f"user_{user_id}_docs",
        metadata={"description": f"Documents for user {user_id}"}
    )


def add_document_chunks(
    user_id: int,
    chunks: list[dict],
    embeddings: list[list[float]]
) -> None:
    """
    Add document chunks with their embeddings to ChromaDB.

    Args:
        user_id: ID of the user who uploaded the document
        chunks: List of {"text": "...", "metadata": {...}} from text_chunker
        embeddings: Corresponding embedding vectors from embeddings module
    """
    collection = get_collection(user_id)

    # Prepare data for ChromaDB
    ids = [chunk["metadata"]["chunk_id"] for chunk in chunks]
    documents = [chunk["text"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]

    # Add/update in collection using upsert to avoid duplicate ID errors
    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )


def query_chunks(
    user_id: int,
    query_embedding: list[float],
    top_k: int = 5
) -> list[dict]:
    """
    Query ChromaDB for the most relevant chunks to a user's question.

    Args:
        user_id: ID of the user
        query_embedding: Embedding vector of the user's question
        top_k: Number of top results to return

    Returns:
        List of {"text": "...", "document_name": "...", "page_number": N, "score": F}
    """
    collection = get_collection(user_id)

    # Check if collection has any documents
    if collection.count() == 0:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count())
    )

    # Format results into a clean list
    formatted = []
    if results and results["documents"] and results["documents"][0]:
        for i in range(len(results["documents"][0])):
            formatted.append({
                "text": results["documents"][0][i],
                "document_name": results["metadatas"][0][i].get("document_name", "Unknown"),
                "page_number": results["metadatas"][0][i].get("page_number", 0),
                "score": results["distances"][0][i] if results["distances"] else 0
            })

    return formatted


def delete_document_chunks(user_id: int, document_name: str) -> None:
    """
    Delete all chunks belonging to a specific document from ChromaDB.

    Args:
        user_id: ID of the user
        document_name: Original name of the document to delete
    """
    collection = get_collection(user_id)

    # Get all chunks for this document
    results = collection.get(
        where={"document_name": document_name}
    )

    # Delete by IDs if any chunks found
    if results and results.get("ids") and len(results["ids"]) > 0:
        collection.delete(ids=results["ids"])


# In-memory search cache mapping: (user_id, question_text) -> list[dict]
_search_cache: dict[tuple[int, str], list[dict]] = {}


def get_cached_chunks(user_id: int, question: str) -> list[dict] | None:
    """Retrieve cached search results for a specific user and question."""
    return _search_cache.get((user_id, question.strip().lower()))


def set_cached_chunks(user_id: int, question: str, chunks: list[dict]) -> None:
    """Store search results in cache for a specific user and question."""
    _search_cache[(user_id, question.strip().lower())] = chunks


def clear_user_search_cache(user_id: int) -> None:
    """Clear all cached searches for a specific user."""
    keys_to_remove = [k for k in list(_search_cache.keys()) if k[0] == user_id]
    for k in keys_to_remove:
        _search_cache.pop(k, None)
