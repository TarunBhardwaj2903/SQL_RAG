-- =============================================================
-- Migration: Schema Tree Navigation — filtered match_schemas
-- =============================================================
-- SAFE: drops only the conflicting 3-arg overload (if it exists),
-- then recreates it cleanly. The 2-arg original is NOT touched.
-- Run once in Supabase SQL Editor.
-- =============================================================

-- Step 1: Drop the conflicting 3-arg overload only (safe — 2-arg untouched)
DROP FUNCTION IF EXISTS rag.match_schemas(extensions.vector, integer, text[]);

-- Step 2: Recreate the clean 3-arg overload (no DEFAULT, no ambiguity)
CREATE FUNCTION rag.match_schemas(
  query_embedding extensions.vector,
  match_count     integer,
  table_filter    text[]
)
RETURNS TABLE (
  schema_name text,
  table_name  text,
  schema_text text,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT schema_name, table_name, schema_text,
         1 - (embedding <=> query_embedding) AS similarity
  FROM   rag.schema_embeddings
  WHERE  (schema_name || '.' || table_name) = ANY(table_filter)
  ORDER  BY embedding <=> query_embedding
  LIMIT  match_count;
$$;

-- =============================================================
-- Step 3: Verify — should return 2 rows (pronargs 2 and 3)
-- =============================================================
SELECT proname, pronargs
FROM   pg_proc
JOIN   pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE  nspname = 'rag' AND proname = 'match_schemas';
