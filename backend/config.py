"""
Configuration settings for SmartDocs AI.
All application settings are defined here for easy management.
"""

import os

# Base directory (backend folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Project root (one level up from backend)
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# Database
DATABASE_DIR = os.path.join(PROJECT_ROOT, "database")
DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'fraud_rag.db')}"

# File uploads
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB in bytes
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

# Vector database (ChromaDB)
VECTOR_DB_DIR = os.path.join(BASE_DIR, "vector_db")

# JWT Authentication
SECRET_KEY = os.getenv("SECRET_KEY", "fraud-rag-secret-key-change-in-production-2024")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours

# RAG Settings
CHUNK_SIZE = 500          # Characters per chunk
CHUNK_OVERLAP = 50        # Overlap between chunks
TOP_K_RESULTS = 3         # Number of chunks to retrieve
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Sentence Transformer model
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")   # Llama 3.2 (Fast & intelligent document assistant)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", None)         # Groq Cloud API Key for 24/7 cloud deployment
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")  # Fast active Groq cloud model

# Speed-tuned token limits per query type
OLLAMA_FAST_PREDICT = 128     # Greetings / tiny replies (instant feel)
OLLAMA_CASUAL_PREDICT = 384   # General knowledge / casual chat
OLLAMA_RAG_PREDICT = 1024     # Document RAG queries (full detail & professional structure)

# Fallback message when no relevant information is found
NO_INFO_MESSAGE = "I couldn't find relevant information in the uploaded documents."
