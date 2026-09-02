"""
Text chunking using native zero-dependency recursive text splitting.
Splits extracted text into smaller overlapping chunks while preserving page metadata.
"""

from __future__ import annotations
from config import CHUNK_SIZE, CHUNK_OVERLAP


def _split_text_recursive(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Pure Python recursive character splitter without any external dependencies."""
    if not text:
        return []
    
    separators = ["\n\n", "\n", ". ", " ", ""]
    
    def split(text_to_split: str, sep_idx: int) -> list[str]:
        if len(text_to_split) <= chunk_size or sep_idx >= len(separators):
            return [text_to_split] if text_to_split.strip() else []
            
        sep = separators[sep_idx]
        splits = text_to_split.split(sep) if sep else list(text_to_split)
        
        chunks = []
        current_chunk = ""
        
        for s in splits:
            item = s + (sep if sep else "")
            if len(current_chunk) + len(item) <= chunk_size:
                current_chunk += item
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                # Overlap calculation
                overlap_part = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                current_chunk = overlap_part + item
                
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
            
        # If any chunk is still too large, split with next separator
        final_chunks = []
        for c in chunks:
            if len(c) > chunk_size and sep_idx + 1 < len(separators):
                final_chunks.extend(split(c, sep_idx + 1))
            else:
                final_chunks.append(c)
                
        return final_chunks

    return split(text, 0)


def chunk_text(pages: list[dict], document_name: str) -> list[dict]:
    """
    Split extracted text pages into smaller chunks for embedding.
    """
    chunks = []
    chunk_counter = 0

    for page in pages:
        page_chunks = _split_text_recursive(page["text"], CHUNK_SIZE, CHUNK_OVERLAP)

        for chunk_text_content in page_chunks:
            if not chunk_text_content.strip():
                continue
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
