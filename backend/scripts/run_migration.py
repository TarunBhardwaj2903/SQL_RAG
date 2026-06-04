"""
Run SQL migration to add filtered match_schemas overload.
Usage: python backend/scripts/run_migration.py
"""
import sys
import os
import asyncio
import asyncpg
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings

async def run_migration():
    """Execute the SQL migration file."""
    migration_file = Path(__file__).parent / "add_filtered_match_schemas.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    print(f"📄 Reading migration: {migration_file.name}")
    sql = migration_file.read_text()
    
    print(f"🔗 Connecting to database...")
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        print("⚙️  Executing migration...")
        await conn.execute(sql)
        print("✅ Migration completed successfully!")
        print("   - Added rag.match_schemas(vector, int, text[]) overload")
        print("   - Original rag.match_schemas(vector, int) still available")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
