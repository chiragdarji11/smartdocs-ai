"""
Authentication routes for user registration and login.
"""

from __future__ import annotations

import re
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth import (
    hash_password, verify_password, create_access_token,
    create_reset_token, decode_reset_token
)

router = APIRouter(tags=["Authentication"])

# Strict Regex rules for validation
STRICT_EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
FULLNAME_REGEX = re.compile(r"^[a-zA-Z0-9\s._-]+$")
DUMMY_HASH = "00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000"

# In-memory rate limiter tracking failed login attempts
FAILED_LOGIN_ATTEMPTS = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes


def enforce_rate_limit(key: str):
    """Enforce rate limit on failed login attempts per client identifier."""
    now = time.time()
    attempts = FAILED_LOGIN_ATTEMPTS.get(key, [])
    # Filter attempts within lockout window
    recent_attempts = [t for t in attempts if now - t < LOCKOUT_DURATION_SECONDS]
    FAILED_LOGIN_ATTEMPTS[key] = recent_attempts

    if len(recent_attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again in 15 minutes."
        )


def record_failed_login(key: str):
    """Record a failed login attempt for rate limiting."""
    now = time.time()
    attempts = FAILED_LOGIN_ATTEMPTS.get(key, [])
    attempts.append(now)
    FAILED_LOGIN_ATTEMPTS[key] = attempts


def reset_failed_login(key: str):
    """Reset failed login count on successful login."""
    if key in FAILED_LOGIN_ATTEMPTS:
        del FAILED_LOGIN_ATTEMPTS[key]


# --- Request/Response Models ---

class RegisterRequest(BaseModel):
    """Request body for user registration."""
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    """Request body for user login."""
    email: str
    password: str


class AuthResponse(BaseModel):
    """Response body for successful authentication."""
    access_token: str
    token_type: str = "bearer"
    username: str


class ForgotPasswordRequest(BaseModel):
    """Request body for requesting password reset token."""
    email: str


class ResetPasswordRequest(BaseModel):
    """Request body for resetting password with token."""
    token: str
    new_password: str


# --- Helper Validation Functions ---

def validate_register_input(username_raw: str, email_raw: str, password_raw: str):
    """Perform strict server-side validation of registration input fields."""
    username = username_raw.strip() if username_raw else ""
    email = email_raw.strip().lower() if email_raw else ""
    password = password_raw if password_raw else ""

    # Full Name / Username validation
    if not username:
        raise HTTPException(status_code=400, detail="Please enter your full name.")
    if len(username) < 3 or len(username) > 50:
        raise HTTPException(status_code=400, detail="Name must be between 3 and 50 characters.")
    if not FULLNAME_REGEX.match(username):
        raise HTTPException(status_code=400, detail="Name can contain only letters and spaces.")

    # Email validation
    if not email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(email) > 100:
        raise HTTPException(status_code=400, detail="Email must be 100 characters or less.")
    if not STRICT_EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    # Password validation
    if not password or password.isspace():
        raise HTTPException(status_code=400, detail="Password cannot be empty.")
    if len(password) < 8 or len(password) > 64:
        raise HTTPException(status_code=400, detail="Password must be between 8 and 64 characters.")

    has_upper = bool(re.search(r"[A-Z]", password))
    has_lower = bool(re.search(r"[a-z]", password))
    has_digit = bool(re.search(r"[0-9]", password))
    has_special = bool(re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?~]", password))

    if not (has_upper and has_lower and has_digit and has_special):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least: 1 uppercase, 1 lowercase, 1 number, and 1 special character."
        )

    return username, email, password


# --- Routes ---

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account with strict server-side validation.
    """
    username, email, password = validate_register_input(
        request.username, request.email, request.password
    )

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="This username/name is already registered.")

    # Create new user
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Registration successful", "username": user.username}


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """
    Login with email/username and password.
    Returns a JWT access token on successful authentication.
    """
    client_ip = req.client.host if req.client else "unknown"
    login_identifier = request.email.strip() if request.email else ""
    password = request.password if request.password else ""

    rate_limit_key = f"{client_ip}:{login_identifier.lower()}"
    enforce_rate_limit(rate_limit_key)

    if not login_identifier or not password:
        record_failed_login(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Find user by email (lowercase-normalized) or username (exact)
    user = db.query(User).filter(
        (User.email == login_identifier.lower()) | (User.username == login_identifier)
    ).first()

    # Verify password / mitigate timing attacks and username enumeration
    if not user:
        record_failed_login(rate_limit_key)
        verify_password(password, DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not verify_password(password, user.hashed_password):
        record_failed_login(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Reset failed attempt count on success
    reset_failed_login(rate_limit_key)

    # Create JWT token with user ID as the subject
    token = create_access_token(data={"sub": str(user.id)})

    return AuthResponse(
        access_token=token,
        username=user.username
    )


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset token for registered email.
    """
    email_clean = request.email.strip().lower() if request.email else ""
    if not email_clean or not STRICT_EMAIL_REGEX.match(email_clean):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account registered with this email address.")

    reset_token = create_reset_token(user.id)
    return {
        "message": "Password reset token generated successfully.",
        "reset_token": reset_token,
        "email": user.email
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using valid reset token.
    """
    user_id = decode_reset_token(request.token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_pwd = request.new_password if request.new_password else ""
    if len(new_pwd) < 8 or len(new_pwd) > 64:
        raise HTTPException(status_code=400, detail="Password must be between 8 and 64 characters.")

    has_upper = bool(re.search(r"[A-Z]", new_pwd))
    has_lower = bool(re.search(r"[a-z]", new_pwd))
    has_digit = bool(re.search(r"[0-9]", new_pwd))
    has_special = bool(re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?~]", new_pwd))

    if not (has_upper and has_lower and has_digit and has_special):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least: 1 uppercase, 1 lowercase, 1 number, and 1 special character."
        )

    user.hashed_password = hash_password(new_pwd)
    db.commit()

    return {"message": "Password has been successfully reset! You can now login with your new password."}

