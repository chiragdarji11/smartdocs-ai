from __future__ import annotations
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, SessionLocal
from models import ChatHistory, User, Document
from auth import get_current_user
from config import TOP_K_RESULTS
from rag.embeddings import generate_single_embedding
from rag.vector_store import query_chunks
from rag.llm import generate_answer_stream, detect_intent, generate_chat_title

router = APIRouter(tags=["Chat"])


class ChatRequest(BaseModel):
    """Request body for asking a question."""
    question: str
    conversation_id: str = None
    document_ids: Optional[List[int]] = None


class RenameRequest(BaseModel):
    """Request body for renaming a conversation."""
    title: str


import re


def is_inventory_query(question: str) -> Optional[str]:
    """Check if the question is asking about count, list, or existence of uploaded documents."""
    q = question.lower().strip()
    cleaned = re.sub(r'[^\w\s]', '', q)

    # Count patterns
    count_patterns = [
        r'\b(kitne|kitni)\s+(documents?|docs?|files?|pdfs?)\b',
        r'\bhow\s+many\s+(documents?|docs?|files?|pdfs?)\b',
        r'\btotal\s+(documents?|docs?|files?|pdfs?)\b',
        r'\bnumber\s+of\s+(documents?|docs?|files?)\b',
        r'\b(kitna|kitne)\s+data\s+hai\b',
        r'\b(kitne\s+upload|kitni\s+upload)\b',
        r'\b(kitne\s+hai|kitne\s+hain)\b'
    ]
    if any(re.search(pat, cleaned) for pat in count_patterns):
        return "count_documents_inventory"

    # List patterns
    list_patterns = [
        r'\b(list|show|names?|kaunse|kaun\s+se|konsi|kon\s+se)\s+(documents?|docs?|files?|pdfs?)\b',
        r'\b(documents?|docs?|files?|pdfs?)\s+(list|dikhao|batao|naam|names)\b',
        r'\bwhat\s+(documents?|files?|pdfs?)\s+(do\s+i\s+have|are\s+uploaded|are\s+there)\b',
        r'\b(kya\s+kya\s+upload\s+kiya|kya\s+upload\s+hai|uploaded\s+files)\b'
    ]
    if any(re.search(pat, cleaned) for pat in list_patterns):
        return "list_documents_inventory"

    return None


def handle_inventory_query(intent: str, question: str, user_docs: Optional[list]) -> str:
    """
    Format metadata responses for document inventory queries directly from database.
    Always returns real database records for the logged-in user.
    """
    if not user_docs:
        return "Aapke account me abhi koi document uploaded nahi hai."

    if intent == "list_documents_inventory":
        lines = [f"Aapke paas total **{len(user_docs)}** uploaded document(s) hain:\n"]
        for idx, doc in enumerate(user_docs, 1):
            lines.append(f"{idx}. **{doc.original_name}** ({doc.file_type.upper()})")
        return "\n".join(lines)

    elif intent == "count_documents_inventory":
        count = len(user_docs)
        if count == 1:
            return f"Aapke paas **1** uploaded document hai:\n\n• **{user_docs[0].original_name}**"
        else:
            doc_list = "\n".join([f"• **{d.original_name}**" for d in user_docs])
            return f"Aapke paas total **{count}** uploaded documents hain:\n\n{doc_list}"

    return "Aapke paas abhi koi uploaded document nahi hai."


@router.post("/chat")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ask a question and stream the AI answer with citations.
    Supports multi-document RAG filtering and Document Inventory Awareness.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        # Ensure we have a conversation ID
        conversation_id = request.conversation_id
        if not conversation_id:
            import uuid
            conversation_id = str(uuid.uuid4())

        # Check if conversation exists and get its title (Optimized select query)
        existing_chat = db.query(ChatHistory.conversation_title).filter(
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.user_id == current_user.id
        ).first()

        if existing_chat and existing_chat.conversation_title:
            conversation_title = existing_chat.conversation_title
        else:
            conversation_title = generate_chat_title(request.question)

        # Step 0: Check if query is asking for document count / list (Inventory awareness)
        inventory_intent = is_inventory_query(request.question)
        if inventory_intent:
            user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
            inventory_answer = handle_inventory_query(inventory_intent, request.question, user_docs)

            def inventory_event_generator():
                thread_db = SessionLocal()
                try:
                    yield f"data: {json.dumps({'type': 'conversation', 'conversation_id': conversation_id, 'title': conversation_title})}\n\n"
                    yield f"data: {json.dumps({'type': 'sources', 'content': []})}\n\n"
                    yield f"data: {json.dumps({'type': 'token', 'content': inventory_answer})}\n\n"

                    chat_entry = ChatHistory(
                        user_id=current_user.id,
                        conversation_id=conversation_id,
                        conversation_title=conversation_title,
                        question=request.question,
                        answer=inventory_answer,
                        sources=json.dumps([])
                    )
                    thread_db.add(chat_entry)
                    thread_db.commit()

                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
                finally:
                    thread_db.close()

            return StreamingResponse(inventory_event_generator(), media_type="text/event-stream")

        # Fetch last 5 conversation turns for memory
        past_chats = db.query(ChatHistory.question, ChatHistory.answer).filter(
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.user_id == current_user.id
        ).order_by(ChatHistory.timestamp.desc()).limit(5).all()

        chat_history_list = []
        for chat in reversed(past_chats):
            chat_history_list.append({
                "question": chat.question,
                "answer": chat.answer
            })

        # Step 1: Detect intent
        intent = detect_intent(request.question, chat_history_list)

        # Step 2: Retrieve relevant chunks ONLY if user has uploaded documents AND query is a document question
        relevant_chunks = []
        user_docs_count = db.query(Document).filter(Document.user_id == current_user.id).count()

        if user_docs_count > 0 and intent == "document_question":
            doc_query = db.query(Document).filter(Document.user_id == current_user.id)
            if request.document_ids:
                doc_query = doc_query.filter(Document.id.in_(request.document_ids))
            
            user_docs = doc_query.all()
            if user_docs:
                target_doc_names = [d.original_name for d in user_docs] if request.document_ids else None
                query_embedding = generate_single_embedding(request.question)
                all_chunks = query_chunks(
                    user_id=current_user.id,
                    query_embedding=query_embedding,
                    top_k=TOP_K_RESULTS * 2 if target_doc_names else TOP_K_RESULTS
                )
                
                if target_doc_names:
                    relevant_chunks = [c for c in all_chunks if c.get("document_name") in target_doc_names][:TOP_K_RESULTS]
                else:
                    relevant_chunks = all_chunks[:TOP_K_RESULTS]

        # Step 3: Format source citations (ONLY on explicit user request)
        sources = []
        q_lower = request.question.lower()
        explicit_source_phrases = [
            "show sources", "show source", "sources", "which document", "which doc",
            "which file", "which pdf", "where did you find", "kahan se", "kaha se",
            "kis file", "kis document", "source kya", "sources kya", "pdf name",
            "doc name", "file name", "citation", "cite source"
        ]
        needs_sources = any(phrase in q_lower for phrase in explicit_source_phrases)

        if needs_sources and relevant_chunks:
            seen_sources = set()
            for chunk in relevant_chunks:
                source_key = f"{chunk['document_name']}_page_{chunk['page_number']}"
                if source_key not in seen_sources:
                    sources.append({
                        "document_name": chunk["document_name"],
                        "page_number": chunk["page_number"]
                    })
                    seen_sources.add(source_key)

        # Step 4: Event Generator for Server-Sent Events (SSE)
        def event_generator():
            thread_db = SessionLocal()
            try:
                yield f"data: {json.dumps({'type': 'conversation', 'conversation_id': conversation_id, 'title': conversation_title})}\n\n"
                yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"

                full_answer = ""
                for token in generate_answer_stream(request.question, relevant_chunks, chat_history_list, intent=intent):
                    full_answer += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                chat_entry = ChatHistory(
                    user_id=current_user.id,
                    conversation_id=conversation_id,
                    conversation_title=conversation_title,
                    question=request.question,
                    answer=full_answer,
                    sources=json.dumps(sources)
                )
                thread_db.add(chat_entry)
                thread_db.commit()

                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            finally:
                thread_db.close()

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initializing chat: {str(e)}")


@router.get("/chat-history")
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all conversation histories for the current user.
    Grouped by conversation_id, ordered by pinned status and timestamp.
    """
    chats = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id
    ).order_by(ChatHistory.timestamp.asc()).all()

    conversations_dict = {}
    for chat in chats:
        conv_id = chat.conversation_id or f"legacy_{chat.id}"
        conv_title = chat.conversation_title or chat.question
        
        if conv_title and not chat.conversation_title and len(conv_title.split()) > 8:
            conv_title = " ".join(conv_title.split()[:6]) + "..."
            
        if conv_id not in conversations_dict:
            conversations_dict[conv_id] = {
                "conversation_id": conv_id,
                "title": conv_title,
                "is_pinned": getattr(chat, 'is_pinned', 0) or 0,
                "timestamp": chat.timestamp,
                "messages": []
            }
        
        conversations_dict[conv_id]["messages"].append({
            "id": chat.id,
            "question": chat.question,
            "answer": chat.answer,
            "sources": json.loads(chat.sources) if chat.sources else [],
            "timestamp": chat.timestamp.isoformat()
        })
        conversations_dict[conv_id]["timestamp"] = chat.timestamp

    conversations_list = list(conversations_dict.values())
    # Sort pinned items first, then by timestamp desc
    conversations_list.sort(key=lambda x: (x.get("is_pinned", 0) or 0, x["timestamp"]), reverse=True)
    
    for conv in conversations_list:
        conv["timestamp"] = conv["timestamp"].isoformat()
        
    return conversations_list


@router.put("/chat-history/{conversation_id}/rename")
def rename_conversation(
    conversation_id: str,
    request: RenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rename a conversation thread."""
    new_title = request.title.strip()
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    chats = db.query(ChatHistory).filter(
        ChatHistory.conversation_id == conversation_id,
        ChatHistory.user_id == current_user.id
    ).all()

    if not chats:
        raise HTTPException(status_code=404, detail="Conversation not found")

    for chat in chats:
        chat.conversation_title = new_title

    db.commit()
    return {"message": "Conversation renamed successfully", "title": new_title}


@router.put("/chat-history/{conversation_id}/pin")
def toggle_pin_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle pinned status for a conversation thread."""
    chats = db.query(ChatHistory).filter(
        ChatHistory.conversation_id == conversation_id,
        ChatHistory.user_id == current_user.id
    ).all()

    if not chats:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_pin = getattr(chats[0], 'is_pinned', 0) or 0
    new_pin = 0 if current_pin == 1 else 1

    for chat in chats:
        chat.is_pinned = new_pin

    db.commit()
    return {"message": "Pin status updated", "is_pinned": new_pin}


@router.delete("/chat-history/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific conversation and all its messages."""
    if conversation_id.startswith("legacy_"):
        try:
            legacy_id = int(conversation_id.split("_")[1])
            chat = db.query(ChatHistory).filter(
                ChatHistory.id == legacy_id,
                ChatHistory.user_id == current_user.id
            ).first()
            if chat:
                db.delete(chat)
                db.commit()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    else:
        db.query(ChatHistory).filter(
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.user_id == current_user.id
        ).delete(synchronize_session=False)
        db.commit()
        
    return {"message": "Conversation deleted successfully"}


@router.delete("/chat-history")
def clear_all_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all conversations and chat messages for the current user."""
    db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"message": "All chat history cleared successfully"}
