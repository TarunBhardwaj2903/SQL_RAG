# Product Overview

SQL RAG is an enterprise Text-to-SQL intelligence platform for B2B Revenue Operations. It lets business users ask natural language questions about their PostgreSQL database and receive accurate SQL queries, tabular results, and AI-generated executive summaries — without writing any SQL.

## Core Capabilities

- **Natural language to SQL**: Users type a business question; the system generates and executes a PostgreSQL SELECT query.
- **Self-correcting agent**: If a generated query fails, the LLM automatically receives the error and retries (up to `MAX_RETRIES` times).
- **RAG-based schema retrieval**: Instead of sending the full schema to the LLM, the system embeds the user query, performs vector search over `rag.schema_embeddings`, and reranks candidates using NVIDIA NIM — sending only the most relevant table definitions.
- **SQL safety guard**: All generated SQL is validated before execution; only SELECT/WITH/SHOW statements are allowed.
- **Executive summaries**: Query results are summarised by a second LLM call into a concise Markdown business narrative.
- **Feedback system**: Users can rate responses; feedback is tracked in the frontend store.

## Target Database

The system is designed around the AdventureWorks PostgreSQL schema with five business schemas: `humanresources`, `person`, `production`, `purchasing`, and `sales`.

## Branding

The UI presents itself as **"Executive Sales Intelligence"** powered by model **RevIntel-SQL-v2**.
