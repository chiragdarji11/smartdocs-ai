"""
Text chunking using LangChain's RecursiveCharacterTextSplitter.
Splits extracted text into smaller overlapping chunks while preserving page metadata.
"""

from __future__ import annotations

from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import CHUNK_SIZE, CHUNK_OVERLAP


def chunk_text(pages: list[dict], document_name: str) -> list[dict]:
    """
    Split extracted text pages into smaller chunks for embedding.

    Args:
        pages: List of {"text": "...", "page_number": N} from text_extractor
        document_name: Original filename for metadata

    Returns:
        List of chunk dictionaries with text and metadata:
        [{"text": "...", "metadata": {"document_name": "...", "page_number": N, "chunk_id": "..."}}]
    """
    # Initialize the text splitter with configured chunk size and overlap
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks = []
    chunk_counter = 0

    for page in pages:
        # Split the page text into smaller chunks
        page_chunks = splitter.split_text(page["text"])

        for chunk_text_content in page_chunks:
            chunk_counter += 1
            chunks.append({
                "text": chunk_text_content,
                "metadata": {
                    "document_name": document_name,
                    "page_number": page["page_number"],
                    "chunk_id": f"{document_name}_chunk_{chunk_counter}"
                }
            })

    return chunks
