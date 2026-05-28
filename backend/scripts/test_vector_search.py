import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.services.database import db_service
from app.services.schema_retriever import get_relevant_schema_context

async def main():
    print("Initializing database...")
    await db_service.initialize()
    
    test_queries = [
        "What is the total sales revenue by product subcategory?",
        "List all employees in the HR department",
        "List the top 10 vendors by their average product lead times",
        "Get all customers from Washington state"
    ]
    
    try:
        for q in test_queries:
            print("\n" + "="*80)
            print(f"Testing Query: '{q}'")
            print("="*80)
            
            schema_str, retrieved, reranked = await get_relevant_schema_context(db_service, q)
            
            print("\nRetrieved Tables (pgvector):")
            for t in retrieved[:5]:
                print(f"  - {t['name']} (similarity: {t['score']})")
                
            print("\nReranked & Selected Tables (Sent to LLM):")
            for t in reranked:
                print(f"  - {t['name']} (score: {t['score']})")
                
            # Verify the schema context is formatted
            print(f"\nFormatted schema context length: {len(schema_str)} characters.")
            
    except Exception as e:
        print(f"Test failed: {e}", file=sys.stderr)
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(main())
