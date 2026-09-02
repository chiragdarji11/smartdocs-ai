"""
LLM integration using Ollama with Qwen3 or Llama3.2.

Handles the prompt engineering and response generation for the chatbot, ensuring:
- Natural, WhatsApp-style Hinglish for Hindi inputs, clear English for English inputs.
- No identity assumption (never says "I am [Document Owner]").
- Proper general knowledge fallback and exact fallback for missing document information.
- Clean filtering of reasoning/thinking tokens.
"""

from __future__ import annotations

import re
import socket
from typing import Generator, Optional

import ollama
from config import (
    OLLAMA_MODEL, NO_INFO_MESSAGE,
    OLLAMA_FAST_PREDICT, OLLAMA_CASUAL_PREDICT, OLLAMA_RAG_PREDICT,
    GROQ_API_KEY, GROQ_MODEL
)

# Optional Groq client initialization
_groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        _groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Groq client init notice: {e}")

def is_ollama_available(host: str = "127.0.0.1", port: int = 11434, timeout: float = 0.4) -> bool:
    """Fast non-blocking check to see if Ollama server is active. Returns in <10ms."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, socket.timeout):
        return False

# List of patterns to identify leaked internal reasoning lines
_REASONING_LINE_PATTERNS = [
    re.compile(r'^thinking\b', re.IGNORECASE),
    re.compile(r'^let\'s think\b', re.IGNORECASE),
    re.compile(r'^i need to\b', re.IGNORECASE),
    re.compile(r'^let me analyze\b', re.IGNORECASE),
    re.compile(r'^we need to check\b', re.IGNORECASE),
]

# ---------------------------------------------------------------------------
# System prompt — Professional, structured, executive-grade AI assistant
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are SmartDocs AI, an expert, highly professional, and intelligent AI Assistant specializing in document intelligence, analytical insights, and comprehensive problem-solving.

Core Directives:
1. Professional Presentation:
   - Provide articulate, well-structured, and authoritative responses.
   - Use clean Markdown formatting: descriptive headings (###), bold key terms, structured bullet points, and numbered lists where appropriate.
   - Keep answers clear, insightful, and direct without unnecessary filler or disclaimers.

2. Language & Tone:
   - Dynamically match the user's language and formality.
   - If the user communicates in Hindi or Hinglish, respond in polished, professional Hinglish.
   - If the user communicates in English, respond in articulate, professional business English.

3. Document Context Grounding:
   - When document context is provided, base your answers strictly and accurately on the facts within that context.
   - Refer to uploaded files respectfully as "your document", "the provided document", or "aapke uploaded document" (never assume personal ownership like "my" or "mera").
   - If a specific question cannot be answered from the provided document context, state this politely and concisely, providing helpful direction.

4. Output Cleanliness:
   - Never output internal reasoning tags like <think> or </think>.
   - Deliver only the final, polished response directly to the user.
"""

def _get_instant_greeting(question: str) -> Optional[str]:
    """Instant 0ms response for greetings and pleasantries without waiting for LLM thinking."""
    cleaned = re.sub(r'[^\w\s]', '', question.lower()).strip()
    
    # Direct short greetings (hy, hi, hello, typos)
    if cleaned in {'hy', 'hi', 'hello', 'hey', 'heyy', 'hola', 'yo', 'sup', 'namaste', 'greetings', 'hlo', 'hii', 'hyy', 'hyjy', 'hye'}:
        return "Hello! How can I help you today? Aap apne documents upload karke unse related koi bhi question pooch sakte hain."
        
    if cleaned in {'good morning', 'gm'}:
        return "Good morning! How can I assist you today?"
        
    if cleaned in {'good afternoon'}:
        return "Good afternoon! How can I assist you with your documents today?"
        
    if cleaned in {'good evening', 'ge'}:
        return "Good evening! How can I help you today?"
        
    if cleaned in {'good night', 'gn'}:
        return "Good night! Take care, let me know if you need anything else later."
        
    # Check-ins / Kaise ho
    if cleaned in {'kaise ho', 'kese ho', 'kaise ho aap', 'ap kaise ho', 'aap kaise ho', 'how are you', 'kya hal hai', 'kya haal hai', 'sab badhiya', 'aur batao', 'batao', 'kese'}:
        return "Main badhiya hoon! Aap bataiye, aaj kis document ya topic par madad chahiye?"
        
    # Thanks / Gratitude
    if cleaned in {'thanks', 'thank you', 'thankyou', 'shukriya', 'dhanyawad'}:
        return "You're welcome! Agar koi aur sawal ho toh zaroor batayein."
        
    # Bye / Exit
    if cleaned in {'bye', 'goodbye', 'alvida', 'take care'}:
        return "Goodbye! Have a great day ahead!"
        
    # Acknowledgments / Casual
    if cleaned in {'ok', 'okay', 'theek hai', 'thik hai', 'accha', 'achha', 'sahi', 'sahi hai', 'sahii', 'done', 'great', 'nice', 'cool', 'badhiya', 'badiya'}:
        return "Ji bilkul! Bataiye aage kya check karna hai?"
        
    return None

# ---------------------------------------------------------------------------
# Ollama options tuned for Llama 3.2
# ---------------------------------------------------------------------------
_OLLAMA_RAG_OPTIONS = {
    "temperature": 0.3,       # Lower temperature for precise, fact-grounded analysis
    "top_p": 0.9,
    "repeat_penalty": 1.15,
    "num_predict": 1024,
    "num_ctx": 4096,
}

_OLLAMA_OPEN_OPTIONS = {
    "temperature": 0.6,       # Balanced temperature for natural, intelligent conversation
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "num_predict": 768,
    "num_ctx": 4096,
}

def _get_ollama_options(chunks: list[dict] = None, intent: str = None) -> dict:
    """Return Ollama generation options based on context and intent."""
    if chunks and len(chunks) > 0:
        return _OLLAMA_RAG_OPTIONS
    return _OLLAMA_OPEN_OPTIONS


def _is_simple_greeting(question: str) -> bool:
    """Return True if the question is a common greeting, small talk, check-in, or casual chat."""
    cleaned = re.sub(r'[^\w\s]', '', question.lower()).strip()
    greetings = {
        'hi', 'hello', 'hey', 'hy', 'helloo', 'hola', 'yo', 
        'greetings', 'namaste', 'sup', 'heyy', 'heyya', 'ju',
        'good morning', 'good afternoon', 'good evening', 'gm', 'gn', 'good night',
        'thanks', 'thank you', 'thankyou', 'shukriya', 'dhanyawad', 'ok', 'okay', 'bye', 'goodbye',
        'nice', 'cool', 'haha', 'lol', 'sweet', 'amazing', 'great', 'awesome',
        'im fine', 'i am fine', 'im good', 'i am good', 'doing good', 'all good', 'sab badiya',
        'good job', 'nice work', 'well done', 'great job', 'you are awesome', 'youre awesome',
        'good my love', 'take care', 'my friend', 'kaise ho', 'kese ho', 'kaise ho aap', 'ap kaise ho',
        'kese ho ap', 'aap kaise ho', 'kya hal hai', 'kya haal hai', 'sab badhiya', 'aur batao', 'batao'
    }
    if cleaned in greetings:
        return True

    # Regex patterns for conversational check-ins
    greeting_patterns = [
        r'\b(kaise|kese)\s+ho\b',
        r'\bhow\s+are\s+you\b',
        r'\b(kya\s+haal|kya\s+chal\s+raha)\b',
        r'\b(ap|aap)\s+batao\b',
        r'\b(badhiya|badiya)\s+(aap|app|ap)\b'
    ]
    return any(re.search(pat, cleaned) for pat in greeting_patterns)


def detect_intent(question: str, history: list[dict] = None) -> str:
    """
    Classifies the user query intent cleanly:
    - 'document_question': Questions specifically asking about document/file content.
    - 'general_chat': All other normal questions (general knowledge, coding, greetings, conversation).
    """
    cleaned = re.sub(r'[^\w\s]', '', question.lower()).strip()
    
    if _is_simple_greeting(question):
        return "general_chat"
        
    # Explicit document phrases (must indicate looking at uploaded files)
    doc_patterns = [
        r'\b(document|documents|doc|docs|pdf|docx|txt|file|files)\b',
        r'\b(resume|cv|marksheet|marksheets|certificate|certificates|transcript)\b',
        r'\b(uploaded|upload\s+kiya|upload\s+ki|meri\s+file|mere\s+doc|mera\s+doc)\b',
        r'\b(in\s+the\s+doc|in\s+my\s+doc|in\s+my\s+resume|in\s+the\s+file|in\s+the\s+pdf|in\s+my\s+file)\b',
        r'\b(file\s+me|doc\s+me|pdf\s+me|resume\s+me|marksheet\s+me)\b',
        r'\b(mere\s+project|mera\s+project|my\s+projects?|meri\s+skills?|my\s+skills?|meri\s+marks|my\s+marks|mera\s+score|my\s+cgpa|my\s+percentage)\b',
        r'\b(summary\s+of\s+(?:the\s+)?(?:doc|pdf|file|resume)|summarize\s+(?:the\s+)?(?:doc|pdf|file|resume))\b',
        r'\b(kisme\s+likha|kahan\s+likha|kaha\s+hai\s+file|page\s+number|source\s+document)\b'
    ]
    
    if any(re.search(pat, cleaned) for pat in doc_patterns):
        return "document_question"
        
    return "general_chat"


def _is_reasoning_line(line: str) -> bool:
    """Return True if line looks like leaked internal reasoning."""
    stripped = line.strip()
    if not stripped:
        return False
    if len(stripped) > 150:
        return False
    return any(p.search(stripped) for p in _REASONING_LINE_PATTERNS)


def synthesize_clean_fallback_answer(question: str, chunks: list[dict]) -> str:
    """Synthesizes a clean natural answer from chunks without exposing raw chunk blocks or Source headers."""
    if not chunks:
        return "Uploaded documents me is baare me jankari nahi mili."

    combined_text = "\n".join([c["text"].strip() for c in chunks])
    lines = [line.strip() for line in combined_text.splitlines() if line.strip()]

    unique_lines = []
    seen = set()
    for line in lines:
        lower = line.lower()
        if lower not in seen and not any(skip in lower for skip in ["source ", "page ", "http", "www.", "github.com", "linkedin.com"]):
            seen.add(lower)
            unique_lines.append(line)

    if not unique_lines:
        return "Uploaded documents me is baare me jankari nahi mili."

    summary_points = unique_lines[:6]
    formatted_points = "\n".join([f"• {pt}" for pt in summary_points])
    return f"Uploaded documents ke anusaar summary:\n\n{formatted_points}"


def _sanitize(text: str) -> str:
    """Strip internal think blocks, keeping Ollama's response completely intact and clean."""
    if not text:
        return NO_INFO_MESSAGE

    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text.strip() if text.strip() else NO_INFO_MESSAGE


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------
def build_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a reference block for the LLM prompt. Deduplicates chunks."""
    if not chunks:
        return ""
    parts = []
    seen_texts = set()
    source_index = 1
    for c in chunks:
        normalized_text = c["text"].strip()
        if normalized_text in seen_texts:
            continue
        seen_texts.add(normalized_text)

        parts.append(
            f"[Source {source_index}: {c['document_name']}, Page {c['page_number']}]\n"
            f"{c['text']}"
        )
        source_index += 1
    return "\n---\n".join(parts)


def _build_user_message(question: str, chunks: list[dict]) -> str:
    """Build the user message. If document chunks exist, attach them. Otherwise just pass the question."""
    context = build_context(chunks)
    if context:
        return (
            f"Document Context:\n{context}\n\n"
            f"Question: {question}"
        )
    return question


def _build_messages(question: str, chunks: list[dict], history: list[dict] = None, intent: str = None) -> list[dict]:
    """Build the message list for ollama.chat(). Simple and clean."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    if history:
        for turn in history[-3:]:
            messages.append({"role": "user", "content": turn["question"]})
            messages.append({"role": "assistant", "content": turn.get("answer", "")})
            
    user_content = _build_user_message(question, chunks)
    messages.append({"role": "user", "content": user_content})
    return messages


# ---------------------------------------------------------------------------
# Public APIs
# ---------------------------------------------------------------------------
def generate_llm_response(prompt: str) -> str:
    """
    Generate a single text response from the LLM for a given prompt (used by Intelligence features).
    Supports Groq Cloud in production and local Ollama for offline use.
    """
    if _groq_client:
        try:
            chat_completion = _groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=GROQ_MODEL,
                temperature=0.3,
                max_tokens=1024,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq response error: {e}")

    if not is_ollama_available():
        return (
            "### AI Intelligence Result (Local Mode)\n\n"
            "*(Note: AI service is currently offline. Start Ollama (`ollama run llama3.2`) or provide GROQ_API_KEY for full AI reasoning.)*\n\n"
            f"{prompt[:1800]}\n..."
        )

    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options=_OLLAMA_RAG_OPTIONS,
            think=False,
        )
        raw = response["message"]["content"].strip()
        return _sanitize(raw)
    except Exception as e:
        print(f"Ollama connection notice in generate_llm_response: {e}")
        return (
            "### AI Intelligence Result (Local Mode)\n\n"
            f"{prompt[:1800]}\n..."
        )


def generate_answer(question: str, chunks: list[dict], history: list[dict] = None, intent: str = None) -> str:
    """Generate a complete answer and return it after sanitisation. Fast-paths greetings."""
    # Fast-path: instant greeting response without Ollama
    instant = _get_instant_greeting(question)
    if instant:
        return instant

    opts = _get_ollama_options(chunks, intent)
    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=_build_messages(question, chunks, history, intent),
            options=opts,
            think=False,
        )
        raw = response["message"]["content"].strip()
        return _sanitize(raw)
    except Exception as e:
        print(f"Ollama connection notice: {e}")
        if chunks:
            return synthesize_clean_fallback_answer(question, chunks)
        elif _is_simple_greeting(question):
            return "Hello! How can I assist you with your documents and questions today?"
        else:
            return f"Ollama model is currently connecting or offline. Please ensure Ollama is running (`ollama serve`) with model `{OLLAMA_MODEL}`."


def generate_answer_stream(
    question: str, chunks: list[dict], history: list[dict] = None, intent: str = None
) -> Generator[str, None, None]:
    """Yield sanitised answer tokens from Ollama's streaming API, with robust offline fallback.
    Fast-paths greetings for instant 0ms response and checks Ollama availability in <10ms."""
    # Fast-path 1: instant greeting response without calling LLM at all
    instant = _get_instant_greeting(question)
    if instant:
        yield instant
        return

    # Groq Cloud streaming if API key is provided (Production Cloud Mode)
    if _groq_client:
        try:
            messages = _build_messages(question, chunks, history, intent)
            stream = _groq_client.chat.completions.create(
                messages=messages,
                model=GROQ_MODEL,
                temperature=0.3 if (chunks and len(chunks) > 0) else 0.6,
                max_tokens=1024,
                stream=True,
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                if content:
                    yield content
            return
        except Exception as e:
            print(f"Groq streaming notice: {e}")

    # Local Ollama check
    if not is_ollama_available():
        if chunks:
            clean_fallback = synthesize_clean_fallback_answer(question, chunks)
            yield clean_fallback
        elif _is_simple_greeting(question) or any(kw in question.lower() for kw in ['kam', 'kaam', 'kya kar', 'what can you do', 'help', 'kya hai']):
            yield "Main aapki documents aur general analysis mein madad kar sakta hoon:\n\n• **Document Q&A & Search**: Uploaded documents ke baare mein sawal poochein\n• **AI Document Intelligence**: Executive summaries, comparison, aur study notes create karein\n• **Analytical Insights**: Complex documents ka detailed breakdown aur structured explanations paayein"
        else:
            yield f"Ollama service is currently offline. Please start Ollama (`ollama run {OLLAMA_MODEL}` or open the Ollama app)."
        return

    opts = _get_ollama_options(chunks, intent)
    try:
        stream = ollama.chat(
            model=OLLAMA_MODEL,
            messages=_build_messages(question, chunks, history, intent),
            options=opts,
            stream=True,
            think=False,
        )

        in_think_block = False
        buffer = ""
        flushed = False
        yielded_anything = False

        for chunk in stream:
            token: str = chunk.get("message", {}).get("content", "")
            if not token:
                continue

            token_lower = token.lower()

            if "<think>" in token_lower:
                in_think_block = True
                continue
            if "</think>" in token_lower:
                in_think_block = False
                continue

            if "thinking..." in token_lower or "thinking…" in token_lower:
                in_think_block = True
                continue
            if "done thinking" in token_lower:
                in_think_block = False
                continue

            if in_think_block:
                continue

            if not flushed:
                buffer += token
                # Flush early — reduced from 20 to 5 chars for much faster TTFT
                if "\n" in buffer or len(buffer) >= 5:
                    clean = _sanitize(buffer)
                    if clean and clean != NO_INFO_MESSAGE:
                        flushed = True
                        yielded_anything = True
                        yield clean
                        buffer = ""
                    else:
                        buffer = ""
                continue

            yielded_anything = True
            yield token

        if not flushed and buffer.strip():
            clean = _sanitize(buffer)
            if clean:
                yielded_anything = True
                yield clean

        if not yielded_anything:
            yield NO_INFO_MESSAGE

    except Exception as e:
        print(f"Ollama stream connection notice: {e}")
        if chunks:
            clean_fallback = synthesize_clean_fallback_answer(question, chunks)
            yield clean_fallback
        elif _is_simple_greeting(question) or any(kw in question.lower() for kw in ['kam', 'kaam', 'kya kar', 'what can you do', 'help']):
            yield "Main aapki documents aur general analysis mein madad kar sakta hoon:\n\n• **Document Q&A & Search**: Uploaded documents ke baare mein sawal poochein\n• **AI Document Intelligence**: Executive summaries, comparison, aur study notes create karein\n• **Analytical Insights**: Complex documents ka detailed breakdown aur structured explanations paayein"
        else:
            yield f"Ollama service is currently connecting or offline. Please ensure Ollama is active (`ollama serve`) with model `{OLLAMA_MODEL}`."


def generate_chat_title(question: str) -> str:
    """Generate a clean, short title (5-8 words max) from the user's first message."""
    q = question.strip()
    # Remove common start phrases to get the core topic
    prefixes = [
        "what is the", "what is a", "what is", "can you explain", "explain", 
        "how to", "write a", "difference between", "tell me about", "tell me",
        "show me", "what are the", "what are my", "summarize the", "summarize"
    ]
    q_lower = q.lower()
    for prefix in prefixes:
        if q_lower.startswith(prefix):
            q = q[len(prefix):].strip()
            break
            
    # Remove leading/trailing symbols/punctuation
    q = re.sub(r'^[^\w\s\-\_]+|[^\w\s\-\_]+$', '', q)
    
    # Capitalize first letter
    if q:
        q = q[0].upper() + q[1:]
    else:
        q = "New Chat"
        
    # Split words
    words = q.split()
    if len(words) > 6:
        return " ".join(words[:6]) + "..."
    elif len(words) == 0:
        return "New Chat"
    return " ".join(words)

