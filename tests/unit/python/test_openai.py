#!/usr/bin/env python3
import sys
import json

def test_openai_connection(api_key):
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        
        if response.choices:
            print("SUCCESS")
            return True
        else:
            print("ERROR: No response from OpenAI")
            return False
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: API key required")
        sys.exit(1)
    
    api_key = sys.argv[1]
    success = test_openai_connection(api_key)
    sys.exit(0 if success else 1)