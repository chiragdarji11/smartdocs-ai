"""
Database setup using SQLAlchemy with SQLite.
Creates the database engine, session factory, and provides a dependency for FastAPI routes.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL, DATABASE_DIR

# Create database directory if it doesn't exist
os.makedirs(DATABASE_DIR, exist_ok=True)

# Create SQLAlchemy engine
# connect_args is needed for SQLite to allow multi-threaded access
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
