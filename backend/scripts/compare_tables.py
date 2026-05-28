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
        # Get count of tables in database
        db_tables = await conn.fetch("""
            SELECT DISTINCT table_schema, table_name 
            FROM information_schema.columns 
            WHERE table_schema IN ('humanresources', 'person', 'production', 'purchasing', 'sales');
        """)
        db_set = {f"{r['table_schema'].lower()}.{r['table_name'].lower()}" for r in db_tables}
        
        # Get count of tables in schema_embeddings
        rag_tables = await conn.fetch("SELECT schema_name, table_name FROM rag.schema_embeddings;")
        rag_set = {f"{r['schema_name'].lower()}.{r['table_name'].lower()}" for r in rag_tables}
        
        print(f"Total tables in database schemas: {len(db_set)}")
        print(f"Total tables in RAG schema embeddings: {len(rag_set)}")
        
        missing = db_set - rag_set
        if missing:
            print(f"Missing tables ({len(missing)}):")
            for m in sorted(missing):
                print(f"  - {m}")
        else:
            print("All tables successfully ingested! No missing tables.")
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
