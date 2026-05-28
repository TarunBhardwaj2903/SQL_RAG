import asyncio
import httpx
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.config import settings

async def main():
    api_key = settings.NVIDIA_API_KEY or settings.OPENAI_API_KEY
    if not api_key:
        print("Error: NVIDIA_API_KEY is not set.")
        return
        
    model = "nvidia/llama-nemotron-rerank-1b-v2"
    
    # Try different endpoints
    endpoints = [
        "https://integrate.api.nvidia.com/v1/ranking",
        f"https://integrate.api.nvidia.com/v1/retrieval/{model}/reranking",
        "https://integrate.api.nvidia.com/v1/rerank",
        "https://integrate.api.nvidia.com/v1/reranking"
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "model": model,
        "query": {"text": "What is the capital of France?"},
        "passages": [
            {"text": "Paris is the capital of France."},
            {"text": "London is the capital of England."}
        ]
    }
    
    for url in endpoints:
        print(f"\nTrying endpoint: {url}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                print(f"Status Code: {response.status_code}")
                if response.status_code == 200:
                    print("SUCCESS!")
                    print(response.json())
                    break
                else:
                    print(f"Response: {response.text[:200]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
