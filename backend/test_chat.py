import sys
import os

# Add current directory to path so config/rag imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rag.llm import generate_answer

def test():
    print("Testing general conversation and dynamic language switching...")
    try:
        # Test English General Chat
        ans1 = generate_answer("Hello! Who are you?", [])
        print(f"User: Hello! Who are you?\nAI: {ans1}\n")
        
        print("-" * 50)
        # Test Hinglish General Chat
        ans2 = generate_answer("Aapka naam kya hai aur aap kya kar sakte ho?", [])
        print(f"User: Aapka naam kya hai aur aap kya kar sakte ho?\nAI: {ans2}\n")
        
        print("-" * 50)
        # Test English Document Query (Fallback)
        ans3 = generate_answer("According to the uploaded documents, what is the summary?", [])
        print(f"User: According to the uploaded documents, what is the summary?\nAI: {ans3}\n")
        
        print("-" * 50)
        # Test Hinglish Document Query (Fallback)
        ans4 = generate_answer("Uploaded documents ke hisab se summary kya hai?", [])
        print(f"User: Uploaded documents ke hisab se summary kya hai?\nAI: {ans4}\n")
    except Exception as e:
        print(f"Error calling LLM (Is Ollama running?): {e}")

if __name__ == "__main__":
    test()
