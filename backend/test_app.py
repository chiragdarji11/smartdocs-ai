"""
Quick verification script to test imports and FastAPI app initialization.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from main import app
    print("✅ FastAPI app loaded successfully with all routers!")
    
    from rag.llm import generate_llm_response, generate_answer, generate_answer_stream
    print("✅ LLM module functions verified!")
    
    print("All backend components verified OK!")
except Exception as e:
    print(f"❌ Error during backend initialization: {e}")
    sys.exit(1)
