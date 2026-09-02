# Authentication Security Audit & Refactoring Report

**Project:** SmartDocs AI (RAG System)  
**Scope:** Authentication & User Verification Module  
**Date:** July 18, 2026  
**Auditor:** Senior Full Stack Engineer  

---

## 1. Summary of Audit

A thorough security and validation audit was conducted on the Authentication module of SmartDocs AI. The audit identified areas vulnerable to credential enumeration, timing attacks, unhandled token-parsing exceptions, and missing input sanitization. All identified concerns have been addressed by implementing defensive security patterns on both the frontend and backend without changing database schemas, project architecture, routes, or API request/response formats.

---

## 2. File Status Matrix

| File Path | Status | Role in Auth |
| :--- | :--- | :--- |
| [config.py](file:///c:/minor%20project/fraud-rag/backend/config.py) | **MODIFIED** | Backend Configuration Settings |
| [auth.py](file:///c:/minor%20project/fraud-rag/backend/auth.py) | **MODIFIED** | JWT Tokens & Hashing Utilities |
| [auth_routes.py](file:///c:/minor%20project/fraud-rag/backend/routes/auth_routes.py) | **MODIFIED** | User Registration & Login Endpoints |
| [Login.jsx](file:///c:/minor%20project/fraud-rag/frontend/src/pages/Login.jsx) | **MODIFIED** | Frontend Sign In Form |
| [Register.jsx](file:///c:/minor%20project/fraud-rag/frontend/src/pages/Register.jsx) | **MODIFIED** | Frontend Sign Up Form |
| [database.py](file:///c:/minor%20project/fraud-rag/backend/database.py) | **UNCHANGED** | SQLAlchemy Engine & DB Sessions |
| [models.py](file:///c:/minor%20project/fraud-rag/backend/models.py) | **UNCHANGED** | User Database Model Schema |
| [AuthContext.jsx](file:///c:/minor%20project/fraud-rag/frontend/src/context/AuthContext.jsx) | **UNCHANGED** | Frontend Auth Context & State |
| [api.js](file:///c:/minor%20project/fraud-rag/frontend/src/api.js) | **UNCHANGED** | Axios Instance & Interceptors |

---

## 3. Rationale for Modifications

### A. Backend Modifications

#### 1. [config.py](file:///c:/minor%20project/fraud-rag/backend/config.py)
* **Why:** The authentication `SECRET_KEY` was hardcoded inside `config.py`. To follow security best practices, this was modified to load from environment variables (`os.getenv("SECRET_KEY", ...)`) so that production environments can set a unique, secret signing key without altering codebase repository files.

#### 2. [auth.py](file:///c:/minor%20project/fraud-rag/backend/auth.py)
* **Why:** In [get_current_user](file:///c:/minor%20project/fraud-rag/backend/auth.py#L69), the code attempted to cast the JWT sub claim straight to an integer (`int(user_id)`). If a user/attacker forged a JWT with an alphabetic or null sub claim, it would raise a `ValueError` or `TypeError` leading to an unhandled `500 Internal Server Error`. A safe conversion block was added to catch these errors and raise a proper `401 Unauthorized` exception.

#### 3. [auth_routes.py](file:///c:/minor%20project/fraud-rag/backend/routes/auth_routes.py)
* **Input Sanitization:** Stripped leading/trailing whitespaces from the username and email to prevent database conflicts and entry mistakes. Emails are normalized to lowercase.
* **Format & Length Validations:** Implemented regex checks for emails and usernames, and boundary length checks (username: 3-50, email: <=100, password: 6-128) to prevent database overflows or hashing DOS (large payloads).
* **Credential Enumeration Prevention:** Replaced distinct error messages (`"User not found"`, `"Incorrect password"`) with a unified message: `"Incorrect email/username or password"`.
* **Timing Attack Mitigation:** Added a dummy verification block that hashes a static mock password if the user is not found, ensuring that execution duration remains virtually identical regardless of user existence.

### B. Frontend Modifications

#### 1. [Login.jsx](file:///c:/minor%20project/fraud-rag/frontend/src/pages/Login.jsx)
* **Why:** Added input trimming client-side on submit and blocked form submissions if either field consists only of whitespaces, which improves local user feedback and reduces unnecessary API calls.

#### 2. [Register.jsx](file:///c:/minor%20project/fraud-rag/frontend/src/pages/Register.jsx)
* **Why:** Implemented thorough client-side validation logic including format verification regex for usernames (alphanumeric/hyphen/underscore) and emails. Provided local UI validation messages to guide users toward correct inputs before any network traffic occurs.

---

## 4. Remaining Security Recommendations

While the core authentication flows are now robustly secured, the following future enhancements are recommended if architectural changes are permitted:

1. **HttpOnly Cookie Token Storage:** Currently, the JWT token is saved in `localStorage`, exposing it to Cross-Site Scripting (XSS) risks. Transitioning to a secure `HttpOnly` cookie-based session token mechanism would isolate the token from client-side scripts.
2. **Login Rate Limiting:** Implement rate-limiting middleware (like `slowapi` or redis-based bucket counters) on `/login` and `/register` endpoints to block automated brute-force attacks.
3. **Database Salt Hashing Upgrade:** The project uses a custom PBKDF2 with SHA-256 implementation. Migrating to standard, robust password hashing algorithms like **Argon2id** (via `argon2-cffi`) or `bcrypt` would increase computational hardness against modern GPU-based cracking attacks.
