"""
Document management routes for upload, listing, deletion, and re-indexing.
Handles the complete document lifecycle including RAG pipeline processing.
"""

from __future__ import annotations

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from database import get_db
from models import Document, User
from auth import get_current_user
from config import UPLOAD_DIR, MAX_UPLOAD_SIZE, ALLOWED_EXTENSIONS
from rag.text_extractor import extract_text
from rag.text_chunker import chunk_text
from rag.embeddings import generate_embeddings
from rag.vector_store import add_document_chunks, delete_document_chunks, clear_user_search_cache

router = APIRouter(tags=["Documents"])


def process_document(file_path: str, file_type: str, original_name: str, user_id: int):
    """
    Process a document through the RAG pipeline:
    1. Extract text from the file
    2. Split text into chunks
    3. Generate embeddings for each chunk
    4. Store chunks and embeddings in ChromaDB
    """
    # Step 1: Extract text
    pages = extract_text(file_path, file_type)
    if not pages:
        raise ValueError("No text could be extracted from the document")

    # Step 2: Chunk text
    chunks = chunk_text(pages, original_name)
    if not chunks:
        raise ValueError("No chunks could be generated from the document")

    # Step 3: Generate embeddings
    chunk_texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(chunk_texts)

    # Step 4: Store in ChromaDB
    add_document_chunks(user_id, chunks, embeddings)

    return len(chunks)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document (PDF, DOCX, or TXT), process it through the RAG pipeline,
    and store it for future querying.
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE // (1024*1024)} MB"
        )

    # Generate unique filename to avoid conflicts
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file to disk
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        # Process through RAG pipeline in a background thread to avoid blocking the event loop
        from fastapi.concurrency import run_in_threadpool
        file_type = file_ext.replace(".", "")  # Remove the dot
        num_chunks = await run_in_threadpool(process_document, file_path, file_type, file.filename, current_user.id)

        # Clear cached searches for this user since documents changed
        clear_user_search_cache(current_user.id)

        # Save document metadata to database
        doc = Document(
            user_id=current_user.id,
            filename=unique_filename,
            original_name=file.filename,
            file_type=file_type,
            file_size=len(content)
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        return {
            "message": "Document uploaded and processed successfully",
            "document_id": doc.id,
            "original_name": doc.original_name,
            "chunks_created": num_chunks
        }

    except Exception as e:
        # Clean up the file if processing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.get("/documents")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all documents uploaded by the current user."""
    try:
        documents = db.query(Document).filter(
            Document.user_id == current_user.id
        ).order_by(Document.upload_date.desc()).all()

        return [
            {
                "id": doc.id,
                "original_name": doc.original_name,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "upload_date": doc.upload_date.isoformat()
            }
            for doc in documents
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while fetching documents: {str(e)}"
        )


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a document: removes the file, vectors from ChromaDB, and database record.
    """
    # Find the document
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete vectors from ChromaDB
    try:
        delete_document_chunks(current_user.id, doc.original_name)
    except Exception:
        pass  # Continue even if vector deletion fails

    # Delete from database
    db.delete(doc)
    db.commit()

    # Clear user's search cache
    clear_user_search_cache(current_user.id)

    return {"message": "Document deleted successfully"}


@router.post("/documents/{document_id}/reindex")
def reindex_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-index a document: delete old embeddings and generate new ones.
    Useful if the embedding model or chunking strategy changes.
    """
    # Find the document
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if file exists
    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    try:
        # Step 1: Delete old vectors
        delete_document_chunks(current_user.id, doc.original_name)

        # Step 2: Re-process through RAG pipeline
        num_chunks = process_document(file_path, doc.file_type, doc.original_name, current_user.id)

        # Clear user's search cache
        clear_user_search_cache(current_user.id)

        return {
            "message": "Document re-indexed successfully",
            "chunks_created": num_chunks
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error re-indexing document: {str(e)}")
