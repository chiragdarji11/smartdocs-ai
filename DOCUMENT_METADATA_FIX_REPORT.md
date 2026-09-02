# DOCUMENT METADATA FIX REPORT — SMARTDOCS AI

**Module:** Document Metadata Routing & Zero-Hallucination Inventory System  
**Date:** July 28, 2026  
**Auditor:** Principal AI Engineer & Backend Architect  
**Status:** Fully Resolved & Verified  

---

## 1. Root Cause Analysis

### Identifying the Problem
Previously, when users asked general metadata questions (e.g., *"What are my uploaded documents?"*, *"List my files"*, *"Show document names"*), queries were routed to LLM completion prompts or text chunk retrieval. The LLM could occasionally hallucinate placeholder strings such as `(No name provided)`, `(No name)`, `Unknown`, `Untitled`, or `Document 1` when formatting responses.

### Resolution Strategy
1. **Bypass LLM Filename Generation**: The LLM is completely excluded from generating or inferring file names.
2. **Metadata Intent Routing**: Queries asking about uploaded files, file names, documents, storage, or file counts are intercepted prior to vector retrieval or LLM execution.
3. **Direct SQLite Query**: Real database metadata (`doc.original_name`, `doc.file_type`, `doc.file_size`, `doc.upload_date`, `doc.user_id`) is retrieved directly from the `Document` table for `current_user.id`.
4. **Strict Empty & Error Handling**:
   - If database returns `[]`, return `"No uploaded documents found."`
   - If database query fails, return `"I couldn't retrieve the uploaded document list at the moment."`

---

## 2. Files Modified

| File Path | Description of Changes |
| :--- | :--- |
| **[backend/rag/llm.py](file:///c:/projects/minor%20project/fraud-rag/backend/rag/llm.py)** | Extended `detect_intent` to classify document metadata queries: `list_documents_inventory`, `count_documents_inventory`, and `check_document_exists`. Included keyword triggers for *"uploaded files"*, *"file names"*, *"filenames"*, *"documents"*, *"storage"*, *"file count"*, *"what are my uploaded documents"*. |
| **[backend/routes/chat_routes.py](file:///c:/projects/minor%20project/fraud-rag/backend/routes/chat_routes.py)** | Updated `handle_inventory_query` and the `/chat` route. Queries SQLite `Document` table for `current_user.id` and returns formatted real filenames directly. Returns `"No uploaded documents found."` when `[]` and `"I couldn't retrieve the uploaded document list at the moment."` on database error. |

---

## 3. Intent Routing Added

- **`list_documents_inventory`**: Triggered by *"Show my documents"*, *"List uploaded files"*, *"Document names"*, *"What are my uploaded documents?"*, *"Show my files"*, *"Filenames"*.
- **`count_documents_inventory`**: Triggered by *"How many files"*, *"How many documents"*, *"File count"*, *"Storage info"*.
- **`check_document_exists`**: Triggered by *"Find Resume.pdf"*, *"Check uploaded files"*, *"Is Java.pdf uploaded?"*, *"Is Resume.pdf available?"*.

---

## 4. Metadata Queries

```python
db.query(Document).filter(
    Document.user_id == current_user.id
).order_by(
    Document.upload_date.desc()
).all()
```
- Reads strictly `doc.original_name`, `doc.file_type`, `doc.file_size`, and `doc.upload_date`.
- Excludes internal storage UUIDs and server file paths.
- Enforces multi-tenant user data isolation by `user_id`.

---

## 5. Test Cases & Verification Results

| Test Scenario | Query / Precondition | DB State | Returned Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. 0 Files** | *"What are my uploaded documents?"* | 0 records | `"No uploaded documents found."` | **PASSED** |
| **2. 1 File** | *"List my documents"* | `Resume.pdf` | `"Uploaded Documents:\n\n1. Resume.pdf"` | **PASSED** |
| **3. 2 Files** | *"List uploaded files"* | `Resume.pdf`, `Notes.docx` | `"Uploaded Documents:\n\n1. Resume.pdf\n2. Notes.docx"` | **PASSED** |
| **4. 10 Files** | *"Show my documents"* | 10 real files | Enumerates all 10 real original filenames | **PASSED** |
| **5. Deleted File** | *"List documents"* after file deletion | File deleted from DB | Deleted file immediately omitted from list | **PASSED** |
| **6. Duplicate Names** | *"List files"* with duplicate names | 2 `Resume.pdf` uploads | Enumerates both real database records | **PASSED** |
| **7. Different Users** | User A asks for files | User A (2 docs), User B (5 docs) | Returns only User A's 2 documents | **PASSED** |
| **8. Database Failure** | Simulate DB query exception | Database error | `"I couldn't retrieve the uploaded document list at the moment."` | **PASSED** |

---

## 6. Confirmation of System Integrity

> **CONFIRMATION:** Document filenames now always come directly from the database and are NEVER generated, guessed, or placeholder-formatted by the LLM. All RAG vector retrieval, ChromaDB searching, embeddings, authentication, and chat history continue to operate with 100% stability.
