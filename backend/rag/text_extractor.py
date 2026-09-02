"""
Text extraction from PDF, DOCX, and TXT files.
Returns a list of dictionaries with 'text' and 'page_number' for each page/section.
"""

from __future__ import annotations

import fitz  # PyMuPDF
from docx import Document as DocxDocument


def extract_from_pdf(file_path: str) -> list[dict]:
    """
    Extract text from a PDF file page by page.
    Returns: [{"text": "...", "page_number": 1}, ...]
    """
    pages = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text().strip()
            if text:  # Only include pages with actual text
                pages.append({
                    "text": text,
                    "page_number": page_num + 1  # 1-indexed
                })
        doc.close()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF document: {str(e)}")
    return pages


def extract_from_docx(file_path: str) -> list[dict]:
    """
    Extract text from a DOCX file.
    DOCX files don't have page numbers, so we treat the entire document as page 1.
    """
    try:
        doc = DocxDocument(file_path)
        full_text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX document: {str(e)}")

    if full_text.strip():
        return [{"text": full_text, "page_number": 1}]
    return []


def extract_from_txt(file_path: str) -> list[dict]:
    """
    Extract text from a plain text file.
    TXT files don't have page numbers, so we treat the entire file as page 1.
    """
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read().strip()
    except Exception as e:
        raise ValueError(f"Failed to read TXT file: {str(e)}")

    if text:
        return [{"text": text, "page_number": 1}]
    return []


def extract_text(file_path: str, file_type: str) -> list[dict]:
    """
    Main extraction function that routes to the correct extractor based on file type.
    Args:
        file_path: Path to the uploaded file
        file_type: File extension (pdf, docx, txt)
    Returns:
        List of {"text": "...", "page_number": N} dictionaries
    """
    if file_type == "pdf":
        return extract_from_pdf(file_path)
    elif file_type == "docx":
        return extract_from_docx(file_path)
    elif file_type == "txt":
        return extract_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
