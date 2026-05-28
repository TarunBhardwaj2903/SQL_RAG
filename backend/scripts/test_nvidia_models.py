"""
Test which NVIDIA NIM models are available for your API key.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from openai import AsyncOpenAI
from app.config import settings

async def test_model(client, model_name):
    """Test if a model is available."""
    try:
        print(f"\n🔍 Testing: {model_name}")
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "Say 'hello' in one word"}],
            max_tokens=10
        )
        print(f"✅ SUCCESS: {model_name}")
        print(f"   Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"❌ FAILED: {model_name}")
        print(f"   Error: {str(e)[:100]}")
        return False

async def main():
    print("=" * 60)
    print("NVIDIA NIM Model Availability Test")
    print("=" * 60)
    
    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url="https://integrate.api.nvidia.com/v1"
    )
    
    # Models to test
    models = [
        "meta/llama-3.1-70b-instruct",
        "meta/llama-3.1-8b-instruct",
        "meta/llama-3.3-70b-instruct",
        "nvidia/llama-3.1-nemotron-70b-instruct",
        "nvidia/nemotron-4-340b-instruct",
        "mistralai/mixtral-8x7b-instruct-v0.1",
        "google/gemma-2-9b-it",
    ]
    
    print(f"\nTesting {len(models)} models...")
    print(f"API Key: {settings.OPENAI_API_KEY[:20]}...")
    
    working_models = []
    
    for model in models:
        if await test_model(client, model):
            working_models.append(model)
        await asyncio.sleep(1)  # Rate limiting
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if working_models:
        print(f"\n✅ {len(working_models)} working models found:")
        for model in working_models:
            print(f"   - {model}")
        
        print(f"\n💡 Recommended: Use the first working model")
        print(f"   Update .env with: OPENAI_MODEL={working_models[0]}")
    else:
        print("\n❌ No working models found!")
        print("\n🔧 Troubleshooting:")
        print("   1. Check your API key at https://build.nvidia.com")
        print("   2. Verify your account has access to chat models")
        print("   3. Check rate limits (40 requests/minute on free tier)")

if __name__ == "__main__":
    asyncio.run(main())
