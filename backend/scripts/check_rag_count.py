import asyncio
import asyncpg
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.config import settings

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        count = await conn.fetchval("SELECT COUNT(*) FROM rag.schema_embeddings;")
        print(f"Number of schema embeddings stored: {count}")
        if count > 0:
            sample = await conn.fetch("SELECT schema_name, table_name FROM rag.schema_embeddings LIMIT 5;")
            print("Sample tables:")
            for s in sample:
                print(f"  - {s['schema_name']}.{s['table_name']}")
    except Exception as e:
        print(f"Error checking RAG count: {e}", file=sys.stderr)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
