"""
AI Intelligence Routes — SmartDocs AI
Endpoints for Summaries, Document Comparison, Study Notes, Quiz Generation, and Smart Insights.
"""

from __future__ import annotations

import json
import os
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Document, User
from auth import get_current_user
from config import UPLOAD_DIR
from rag.text_extractor import extract_text
from rag.llm import generate_llm_response

router = APIRouter(prefix="/intelligence", tags=["Document Intelligence"])


# --- Pydantic Request Models ---

class SummaryRequest(BaseModel):
    document_id: int
    summary_type: str = "medium"  # short, medium, detailed, bullet, executive


class CompareRequest(BaseModel):
    document_id_1: int
    document_id_2: int


class NotesRequest(BaseModel):
    document_id: int
    note_type: str = "study"  # study, revision, interview, bullet, key_concepts


class QuizRequest(BaseModel):
    document_id: int
    difficulty: str = "medium"  # easy, medium, hard


# --- Helper Functions ---

def get_document_full_text(document_id: int, user_id: int, db: Session) -> tuple[Document, str]:
    """Find user document and extract its full text content."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk.")

    pages = extract_text(file_path, doc.file_type)
    if not pages:
        raise HTTPException(status_code=400, detail="Could not extract text from document.")

    full_text = "\n\n".join([p["text"] for p in pages if p.get("text")])
    if not full_text.strip():
        raise HTTPException(status_code=400, detail="Document contains no readable text content.")

    return doc, full_text


# --- Routes ---

@router.post("/summary")
def generate_summary(
    request: SummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI Document Summary (Short, Medium, Detailed, Bullet, Executive)."""
    doc, text = get_document_full_text(request.document_id, current_user.id, db)
    # Truncate text if excessively large for memory efficiency
    truncated_text = text[:12000]

    type_prompts = {
        "short": "Provide a concise 2-3 sentence summary of this document.",
        "medium": "Provide a comprehensive overview of the key points in 2-3 well-structured paragraphs.",
        "detailed": "Provide an in-depth, comprehensive summary detailing all section topics and findings.",
        "bullet": "Provide a clean bullet-point summary highlighting all major points and key takeaways.",
        "executive": "Provide an Executive Summary format with: Executive Overview, Key Highlights, Strategic Takeaways, and Recommendations."
    }

    instruction = type_prompts.get(request.summary_type.lower(), type_prompts["medium"])
    prompt = f"Document Name: {doc.original_name}\n\nTask: {instruction}\n\nDocument Text:\n{truncated_text}"

    summary_result = generate_llm_response(prompt)
    return {
        "document_id": doc.id,
        "original_name": doc.original_name,
        "summary_type": request.summary_type,
        "summary": summary_result
    }


@router.post("/compare")
def compare_documents(
    request: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare two uploaded documents and identify similarities, differences, and missing info."""
    doc1, text1 = get_document_full_text(request.document_id_1, current_user.id, db)
    doc2, text2 = get_document_full_text(request.document_id_2, current_user.id, db)

    prompt = f"""Compare the following two documents thoroughly:

Document A: {doc1.original_name}
Content Excerpt: {text1[:6000]}

Document B: {doc2.original_name}
Content Excerpt: {text2[:6000]}

Format your analysis clearly under the following headings:
### 1. Similarities
### 2. Key Differences
### 3. Missing Information / Gaps
### 4. Overall Comparative Synthesis"""

    comparison_result = generate_llm_response(prompt)
    return {
        "document_1": doc1.original_name,
        "document_2": doc2.original_name,
        "comparison": comparison_result
    }


@router.post("/notes")
def generate_notes(
    request: NotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate structured Study, Revision, Interview, or Key Concepts notes."""
    doc, text = get_document_full_text(request.document_id, current_user.id, db)

    note_prompts = {
        "study": "Generate complete, well-organized Study Notes structured into main modules, sub-topics, and explanations.",
        "revision": "Generate concise Quick Revision Notes focusing on formula/rules, critical definitions, and memory aids.",
        "interview": "Generate Technical & Interview Questions with model answers based on the key concepts in this document.",
        "bullet": "Generate clean, structured Bullet Notes highlighting every major fact and data point.",
        "key_concepts": "Extract and explain the Top Key Concepts & Terminology with definitions and practical contexts."
    }

    instruction = note_prompts.get(request.note_type.lower(), note_prompts["study"])
    prompt = f"Document: {doc.original_name}\nTask: {instruction}\n\nDocument Text:\n{text[:12000]}"

    notes_result = generate_llm_response(prompt)
    return {
        "document_id": doc.id,
        "original_name": doc.original_name,
        "note_type": request.note_type,
        "notes": notes_result
    }


@router.post("/quiz")
def generate_quiz(
    request: QuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate MCQs, True/False, and Short Questions with Answer Keys."""
    doc, text = get_document_full_text(request.document_id, current_user.id, db)

    prompt = f"""Generate a comprehensive quiz from the document below.
Difficulty Level: {request.difficulty.upper()}

Document: {doc.original_name}
Text: {text[:10000]}

Return valid JSON with the following structure:
{{
  "mcqs": [
    {{
      "id": 1,
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Brief explanation"
    }}
  ],
  "true_false": [
    {{
      "id": 1,
      "statement": "Statement text",
      "is_true": true,
      "explanation": "Brief explanation"
    }}
  ],
  "short_questions": [
    {{
      "id": 1,
      "question": "Question text",
      "answer": "Model answer"
    }}
  ]
}}"""

    llm_output = generate_llm_response(prompt)

    # Attempt to extract JSON from markdown codeblock if present
    try:
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", llm_output, re.DOTALL)
        if json_match:
            quiz_data = json.loads(json_match.group(1))
        else:
            quiz_data = json.loads(llm_output)
    except Exception:
        # Fallback structured quiz response if parsing fails
        quiz_data = {
            "mcqs": [
                {
                    "id": 1,
                    "question": f"What is the core topic of {doc.original_name}?",
                    "options": [doc.original_name, "General Document Analysis", "Machine Learning", "Data Management"],
                    "answer": doc.original_name,
                    "explanation": f"The document primarily covers topics related to {doc.original_name}."
                }
            ],
            "true_false": [
                {
                    "id": 1,
                    "statement": f"{doc.original_name} contains technical documentation.",
                    "is_true": True,
                    "explanation": "Document was parsed and indexed successfully."
                }
            ],
            "short_questions": [
                {
                    "id": 1,
                    "question": "Summarize the primary focus of this document.",
                    "answer": f"The document discusses key aspects of {doc.original_name}."
                }
            ]
        }

    return {
        "document_id": doc.id,
        "original_name": doc.original_name,
        "difficulty": request.difficulty,
        "quiz": quiz_data
    }


@router.get("/insights/{document_id}")
def get_document_insights(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect main topics, keywords, entities, reading time, and complexity."""
    doc, text = get_document_full_text(document_id, current_user.id, db)

    words = text.split()
    word_count = len(words)
    reading_time_mins = max(1, round(word_count / 200))

    if word_count < 500:
        complexity = "Beginner"
    elif word_count < 3000:
        complexity = "Intermediate"
    else:
        complexity = "Advanced"

    prompt = f"""Extract metadata insights from this text:
Document: {doc.original_name}
Text: {text[:6000]}

Return JSON:
{{
  "main_topics": ["Topic 1", "Topic 2", "Topic 3"],
  "keywords": ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4", "Keyword 5"],
  "technologies": ["Tech 1", "Tech 2"],
  "important_entities": ["Entity 1", "Entity 2"]
}}"""

    llm_output = generate_llm_response(prompt)

    try:
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", llm_output, re.DOTALL)
        if json_match:
            insights_raw = json.loads(json_match.group(1))
        else:
            insights_raw = json.loads(llm_output)
    except Exception:
        insights_raw = {
            "main_topics": ["Document Analysis", "Data Extraction"],
            "keywords": [doc.file_type.upper(), "Information", "Reference"],
            "technologies": ["Python", "FastAPI", "RAG"],
            "important_entities": [doc.original_name]
        }

    return {
        "document_id": doc.id,
        "original_name": doc.original_name,
        "file_type": doc.file_type,
        "word_count": word_count,
        "reading_time_mins": reading_time_mins,
        "complexity_level": complexity,
        "main_topics": insights_raw.get("main_topics", []),
        "keywords": insights_raw.get("keywords", []),
        "technologies": insights_raw.get("technologies", []),
        "entities": insights_raw.get("important_entities", [])
    }
