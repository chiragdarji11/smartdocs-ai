# SmartDocs AI

An AI-powered application that helps users analyze documents using **Retrieval-Augmented Generation (RAG)**. Upload documents, ask questions in natural language, and get AI-generated answers sourced exclusively from your uploaded content — with full source citations.

Built as an **MCA Final Year Project** — simple, clean, modular, and fully local.

---

## Features

- **User Authentication** — Register, Login, Logout with JWT-based security
- **Document Upload** — Support for PDF, DOCX, and TXT files (up to 25 MB)
- **RAG Pipeline** — Extract text → Chunk → Embed → Store → Retrieve → Answer
- **AI Chat** — Ask questions and get answers only from uploaded documents
- **Source Citations** — Every answer shows the document name and page number
- **Chat History** — All conversations are saved with timestamps
- **Document Management** — Upload, view, delete, and re-index documents
- **Vector Search** — ChromaDB stores embeddings for fast semantic retrieval

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Axios, React Router, Lucide React |
| Backend | FastAPI, Python |
| Database | SQLite |
| Authentication | JWT, Passlib (bcrypt) |
| RAG | LangChain, ChromaDB, Sentence Transformers, Ollama (Llama 3) |
| Document Processing | PyMuPDF, python-docx |

---

## Folder Structure

```
fraud-rag/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py             # Configuration settings
│   ├── database.py           # SQLite database setup
│   ├── models.py             # SQLAlchemy models
│   ├── auth.py               # JWT authentication utilities
│   ├── uploads/              # Uploaded documents stored here
│   ├── vector_db/            # ChromaDB vector storage
│   ├── rag/
│   │   ├── text_extractor.py # Extract text from PDF/DOCX/TXT
│   │   ├── text_chunker.py   # Split text into chunks
│   │   ├── embeddings.py     # Sentence Transformer embeddings
│   │   ├── vector_store.py   # ChromaDB operations
│   │   └── llm.py            # Ollama Llama 3 integration
│   └── routes/
│       ├── auth_routes.py    # Register & Login endpoints
│       ├── document_routes.py# Document CRUD endpoints
│       └── chat_routes.py    # Chat & history endpoints
├── frontend/
│   ├── src/
│   │   ├── api.js            # Axios API client
│   │   ├── App.jsx           # Main app with routing
│   │   ├── main.jsx          # React entry point
│   │   ├── index.css         # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── UploadCard.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── SourceCitation.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Upload.jsx
│   │       ├── Documents.jsx
│   │       └── Chat.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── database/                 # SQLite database file
├── README.md
└── requirements.txt
```

---

## Prerequisites

1. **Python 3.10+** — [Download Python](https://www.python.org/downloads/)
2. **Node.js 18+** — [Download Node.js](https://nodejs.org/)
3. **Ollama** — [Download Ollama](https://ollama.ai/)

After installing Ollama, pull the Llama 3 model:

```bash
ollama pull llama3
```

---

## Installation

### 1. Clone the Repository

```bash
cd fraud-rag
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

---

## How to Run

### Step 1: Start Ollama

Make sure Ollama is running in the background:

```bash
ollama serve
```

### Step 2: Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

### Step 3: Start Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## Usage

1. **Register** a new account
2. **Login** with your credentials
3. **Upload** a document (PDF, DOCX, or TXT)
4. Wait for the document to be processed (text extraction + embedding)
5. Go to **AI Chat** and ask questions like:
   - "Summarize this project proposal."
   - "What are the key terms in this document?"
6. The AI will answer **only** from your uploaded documents with source citations
7. View your **Chat History** anytime

---

## Screenshots

> Screenshots will be added after the application is running.

| Page | Description |
|------|-------------|
| Login | User authentication page |
| Dashboard | Overview with stats and recent uploads |
| Upload | Drag-and-drop document upload |
| Documents | List of uploaded documents |
| AI Chat | Chat interface with source citations |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and get JWT token |
| POST | `/upload` | Upload a document |
| GET | `/documents` | List user's documents |
| DELETE | `/documents/{id}` | Delete a document |
| POST | `/documents/{id}/reindex` | Re-index a document |
| POST | `/chat` | Ask a question |
| GET | `/chat-history` | Get chat history |

---

## Future Scope

- **OCR Support** — Process scanned documents and images
- **Multi-language Support** — Ask questions in different languages
- **Advanced Search** — Filter documents by type, date, or keywords
- **Export Reports** — Generate PDF reports of chat conversations
- **Voice Input** — Ask questions using voice commands
- **Cloud Deployment** — Deploy on AWS/GCP/Azure for remote access
- **Fine-tuned Models** — Train domain-specific models for better accuracy

---

## License

This project is built for educational purposes as part of an MCA Final Year Project.

---

## Author

MCA Final Year Student

---

*Built with ❤️ using FastAPI, React, LangChain, ChromaDB, and Ollama*
