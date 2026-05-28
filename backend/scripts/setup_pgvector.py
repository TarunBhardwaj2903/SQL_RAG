import asyncio
import asyncpg
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.config import settings

async def setup():
    print("Connecting to database...")
    print(f"DATABASE_URL: {settings.DATABASE_URL.split('@')[-1]}") # Print host only for security
    
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        print("Enabling pgvector extension...")
        # Enable vector extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;")
        print("pgvector extension enabled successfully.")

        print("Creating rag schema and schema_embeddings table...")
        # Create schema and table (dropping first to apply dimension change)
        await conn.execute("""
            CREATE SCHEMA IF NOT EXISTS rag;

            DROP TABLE IF EXISTS rag.schema_embeddings CASCADE;

            CREATE TABLE IF NOT EXISTS rag.schema_embeddings (
                id          BIGSERIAL PRIMARY KEY,
                schema_name TEXT NOT NULL,
                table_name  TEXT NOT NULL,
                full_name   TEXT GENERATED ALWAYS AS (schema_name || '.' || table_name) STORED,
                schema_text TEXT NOT NULL,
                embedding   extensions.vector(2048),
                metadata    JSONB DEFAULT '{}'::jsonb,
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                updated_at  TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(schema_name, table_name)
            );
        """)
        print("Schema and table created.")

        print("Creating match_schemas function...")
        await conn.execute("""
            CREATE OR REPLACE FUNCTION rag.match_schemas(
                query_embedding extensions.vector(2048),
                match_count     INT DEFAULT 10
            )
            RETURNS TABLE (
                id          BIGINT,
                schema_name TEXT,
                table_name  TEXT,
                full_name   TEXT,
                schema_text TEXT,
                similarity  FLOAT
            )
            LANGUAGE SQL STABLE
            AS $$
                SELECT
                    id,
                    schema_name,
                    table_name,
                    full_name,
                    schema_text,
                    1 - (embedding <=> query_embedding) AS similarity
                FROM rag.schema_embeddings
                ORDER BY embedding <=> query_embedding
                LIMIT match_count;
            $$;
        """)
        print("match_schemas function created.")
        print("Database setup completed successfully!")

    except Exception as e:
        print(f"Error during setup: {e}", file=sys.stderr)
        raise e
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(setup())
