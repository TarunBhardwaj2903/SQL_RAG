import asyncio
import asyncpg
import logging
import os
import sys
from typing import Dict, List, Any
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

async def introspect_db(db_url: str) -> Dict[tuple, Dict[str, Any]]:
    logger.info("Introspecting database schemas for ingestion...")
    conn = await asyncpg.connect(db_url)
    try:
        # 1. Fetch columns metadata
        columns_query = """
            SELECT table_schema, table_name, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema IN ('humanresources', 'person', 'production', 'purchasing', 'sales')
            ORDER BY table_schema, table_name, ordinal_position;
        """
        columns_records = await conn.fetch(columns_query)

        # 2. Fetch constraints (PKs and FKs)
        constraints_query = """
            SELECT
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name, 
                tc.constraint_type,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
              AND tc.table_schema IN ('humanresources', 'person', 'production', 'purchasing', 'sales');
        """
        constraints_records = await conn.fetch(constraints_query)

        # Organize by table
        tables_meta: Dict[tuple, Dict[str, Any]] = {}
        for r in columns_records:
            key = (r['table_schema'].lower(), r['table_name'].lower())
            if key not in tables_meta:
                tables_meta[key] = {
                    'schema': r['table_schema'].lower(),
                    'table': r['table_name'].lower(),
                    'columns': []
                }
            tables_meta[key]['columns'].append({
                'column_name': r['column_name'].lower(),
                'data_type': r['data_type'].upper(),
                'nullable': r['is_nullable'] == 'YES',
                'is_pk': False,
                'fks': []
            })

        # Add constraints
        for r in constraints_records:
            key = (r['table_schema'].lower(), r['table_name'].lower())
            if key not in tables_meta:
                continue
            col_name = r['column_name'].lower()
            const_type = r['constraint_type']

            for col in tables_meta[key]['columns']:
                if col['column_name'] == col_name:
                    if const_type == 'PRIMARY KEY':
                        col['is_pk'] = True
                    elif const_type == 'FOREIGN KEY' and r['foreign_table_name']:
                        col['fks'].append((
                            r['foreign_table_schema'].lower(),
                            r['foreign_table_name'].lower(),
                            r['foreign_column_name'].lower()
                        ))
        
        return tables_meta
    finally:
        await conn.close()

def format_table_description(table_info: Dict[str, Any]) -> str:
    schema = table_info['schema']
    table = table_info['table']
    cols = table_info['columns']

    lines = []
    lines.append(f"TABLE: {schema}.{table}")
    
    # Primary Key
    pks = [c['column_name'] for c in cols if c['is_pk']]
    if pks:
        lines.append(f"  Primary Key: {', '.join(pks)}")

    # Columns
    for c in cols:
        pk_str = " (PK)" if c['is_pk'] else ""
        null_str = " (NULL)" if c['nullable'] else " (NOT NULL)"
        lines.append(f"  - {c['column_name']}: {c['data_type']}{pk_str}{null_str}")
        
        # Foreign Keys
        for fs, ft, fc in c['fks']:
            lines.append(f"    FK: {schema}.{table}.{c['column_name']} -> {fs}.{ft}.{fc}")
            
    return "\n".join(lines)

async def run_ingestion() -> int:
    """
    Run the ingestion process.
    Returns:
        The number of table schemas successfully ingested.
    """
    api_key = settings.NVIDIA_API_KEY or settings.OPENAI_API_KEY
    if not api_key:
        logger.error("NVIDIA_API_KEY is not set. Cannot run ingestion.")
        raise Exception("NVIDIA_API_KEY is not set.")

    # Initialize OpenAI client pointing to NVIDIA NIM base URL
    openai_client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://integrate.api.nvidia.com/v1"
    )

    tables_meta = await introspect_db(settings.DATABASE_URL)
    logger.info(f"Found {len(tables_meta)} tables to ingest/embed.")

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        # Process in batches to respect rate limits (40 RPM)
        # We can do 5 tables at a time
        batch_size = 10
        table_keys = list(tables_meta.keys())
        success_count = 0
        total_batches = ((len(table_keys) - 1) // batch_size) + 1
        
        for i in range(0, len(table_keys), batch_size):
            batch_keys = table_keys[i:i+batch_size]
            current_batch_num = (i // batch_size) + 1
            logger.info(f"Processing batch {current_batch_num}/{total_batches} ({len(batch_keys)} tables)...")

            batch_meta = []
            batch_texts = []
            for key in batch_keys:
                table_info = tables_meta[key]
                s_name = table_info['schema']
                t_name = table_info['table']
                s_text = format_table_description(table_info)
                batch_meta.append((s_name, t_name, s_text))
                batch_texts.append(s_text)

            # Call NVIDIA embedding NIM API in a single batch request
            response = await openai_client.embeddings.create(
                input=batch_texts,
                model=settings.NVIDIA_EMBED_MODEL,
                extra_body={"input_type": "passage"}
            )

            for (s_name, t_name, s_text), data_item in zip(batch_meta, response.data):
                embedding = data_item.embedding
                await conn.execute("""
                    INSERT INTO rag.schema_embeddings (schema_name, table_name, schema_text, embedding)
                    VALUES ($1, $2, $3, $4::extensions.vector)
                    ON CONFLICT (schema_name, table_name) 
                    DO UPDATE SET 
                        schema_text = EXCLUDED.schema_text,
                        embedding = EXCLUDED.embedding,
                        updated_at = NOW();
                """, s_name, t_name, s_text, str(embedding))
                success_count += 1

            # Brief pause between batches
            if i + batch_size < len(table_keys):
                await asyncio.sleep(1.0)

        logger.info(f"All {success_count} table schemas ingested and embedded successfully!")
        return success_count

    except Exception as e:
        logger.error(f"Error during ingestion: {e}")
        raise e
    finally:
        await conn.close()
