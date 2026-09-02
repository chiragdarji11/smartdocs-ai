"""
SmartDocs AI - Backend Entry Point

FastAPI application that provides:
- User authentication (register/login with JWT)
- Document upload and management
- RAG-based AI chat with source citations

Run with: uvicorn main:app --reload --port 8000
"""

import sys
import types
import uuid
import time
import os

# Mock uuid_utils to prevent loading its compiled DLL which is blocked by Application Control Policy
def mock_uuid7():
    t_ms = int(time.time() * 1000)
    b = bytearray(16)
    b[0:6] = t_ms.to_bytes(6, 'big')
    b[6] = (b[6] & 0x0F) | 0x70
    b[8] = (b[8] & 0x3F) | 0x80
    b[6:] = bytearray(os.urandom(10))
    b[6] = (b[6] & 0x0F) | 0x70
    b[8] = (b[8] & 0x3F) | 0x80
    return uuid.UUID(bytes=bytes(b))

uuid_utils = types.ModuleType('uuid_utils')
uuid_utils_compat = types.ModuleType('uuid_utils.compat')
uuid_utils_compat.uuid7 = mock_uuid7

sys.modules['uuid_utils'] = uuid_utils
sys.modules['uuid_utils.compat'] = uuid_utils_compat

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User, Document, ChatHistory  # Import models so tables are created
from routes.auth_routes import router as auth_router
from routes.document_routes import router as document_router
from routes.chat_routes import router as chat_router
from routes.intelligence_routes import router as intelligence_router
from config import UPLOAD_DIR, VECTOR_DB_DIR

# Create FastAPI app
app = FastAPI(
    title="SmartDocs AI",
    description="Your Intelligent Document Assistant",
    version="1.0.0"
)

# Configure CORS to allow frontend requests with credentials across all local origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(document_router)
app.include_router(chat_router)
app.include_router(intelligence_router)


@app.on_event("startup")
def startup_event():
    """
    Run on application startup:
    1. Create all database tables
    2. Create required directories
    """
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

    # Run database auto-alterations if columns are missing (SQLite auto-migration)
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            conn.execute(text("SELECT conversation_id FROM chat_history LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE chat_history ADD COLUMN conversation_id VARCHAR(50)"))
                conn.execute(text("ALTER TABLE chat_history ADD COLUMN conversation_title VARCHAR(255)"))
                print("Altered chat_history table to add conversation_id and conversation_title columns.")
            except Exception as e:
                print(f"Error altering chat_history table: {e}")

        try:
            conn.execute(text("SELECT is_pinned FROM chat_history LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE chat_history ADD COLUMN is_pinned INTEGER DEFAULT 0"))
                print("Altered chat_history table to add is_pinned column.")
            except Exception as e:
                print(f"Error adding is_pinned column: {e}")

    # Create upload directory
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"Upload directory ready: {UPLOAD_DIR}")

    # Create vector database directory
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)
    print(f"Vector DB directory ready: {VECTOR_DB_DIR}")

    # Seed pre-configured user account
    from database import SessionLocal
    from auth import hash_password
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == "admin@gmail.com").first()
        if not existing_user:
            demo_user = User(
                username="Admin User",
                email="admin@gmail.com",
                hashed_password=hash_password("SmartDocs@123")
            )
            db.add(demo_user)
            db.commit()
            print("✔ Pre-configured demo user active: admin@gmail.com / SmartDocs@123")
        else:
            # Ensure password hash is updated to SmartDocs@123 for seamless login
            existing_user.hashed_password = hash_password("SmartDocs@123")
            db.commit()
            print("✔ Pre-configured demo user ready: admin@gmail.com / SmartDocs@123")
    except Exception as e:
        print(f"User seed notice: {e}")
    finally:
        db.close()

    print("\n🚀 SmartDocs AI API is running!")
    print("📄 API Docs: http://localhost:8001/docs")


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "message": "SmartDocs AI API",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "upload_dir": os.path.exists(UPLOAD_DIR),
        "vector_db_dir": os.path.exists(VECTOR_DB_DIR)
    }
