-- =============================================================
-- Migration: Schema Tree Navigation — filtered match_schemas
-- =============================================================
-- SAFE: adds a NEW 3-argument overload only.
-- The existing 2-argument function is NOT touched.
-- Run once in Supabase SQL Editor.
-- =============================================================

-- Step 1: Add the new 3-arg overload (domain-filtered search)
-- DO NOT modify the existing rag.match_schemas(vector, int) function.
CREATE OR REPLACE FUNCTION rag.match_schemas(
  query_embedding extensions.vector,
  match_count     int,
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
-- Step 2: Verify both overloads exist
-- Run this SELECT to confirm — should return 2 rows.
-- =============================================================
-- SELECT proname, pronargs
-- FROM   pg_proc
-- JOIN   pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
-- WHERE  nspname = 'rag' AND proname = 'match_schemas';

-- =============================================================
-- Step 3: Smoke test the new overload
-- Should return rows only for those 3 tables (ordered by similarity).
-- =============================================================
-- SELECT table_name, similarity
-- FROM rag.match_schemas(
--   (SELECT embedding FROM rag.schema_embeddings LIMIT 1),
--   5,
--   ARRAY['sales.customer', 'sales.salesorderheader', 'production.product']
-- );
