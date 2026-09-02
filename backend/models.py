"""
SQLAlchemy models for the application.
Defines three tables: users, documents, chat_history.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from database import Base


class User(Base):
    """User account model for authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Document(Base):
    """Uploaded document metadata model."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)       # Stored filename (UUID-based)
    original_name = Column(String(255), nullable=False)   # Original upload name
    file_type = Column(String(10), nullable=False)        # pdf, docx, txt
    file_size = Column(Integer, nullable=False)            # Size in bytes
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatHistory(Base):
    """Chat conversation history model."""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(String(50), nullable=True, index=True)
    conversation_title = Column(String(255), nullable=True)
    is_pinned = Column(Integer, default=0, nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sources = Column(Text, nullable=True)  # JSON string of source citations
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
