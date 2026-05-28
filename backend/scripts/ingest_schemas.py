import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.services.schema_ingestor import run_ingestion

async def main():
    print("Starting schema ingestion script...")
    try:
        count = await run_ingestion()
        print(f"Successfully ingested and embedded {count} tables.")
    except Exception as e:
        print(f"Ingestion failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
