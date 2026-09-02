import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rag.llm import generate_answer_stream

def test():
    print("Testing streaming answer generation...")
    try:
        # Test English Query
        print("User: Hello, who are you?")
        print("AI Stream: ", end="", flush=True)
        for token in generate_answer_stream("Hello, who are you?", []):
            print(token, end="", flush=True)
        print("\n" + "-" * 50)
        
        # Test Hinglish Query
        print("User: Phishing kya hoti hai?")
        print("AI Stream: ", end="", flush=True)
        for token in generate_answer_stream("Phishing kya hoti hai?", []):
            print(token, end="", flush=True)
        print("\n")
    except Exception as e:
        print(f"\nError calling streaming LLM: {e}")

if __name__ == "__main__":
    test()
