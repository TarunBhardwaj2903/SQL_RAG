# Tech Stack

## Frontend

- **Framework**: React 18 with JSX (`.jsx` files)
- **Build tool**: Vite 5 with `@vitejs/plugin-react` (Babel-based Fast Refresh)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin — utility classes only, no separate CSS modules
- **Icons**: `lucide-react`
- **No state management library** — React `useState`/`useCallback`/`useRef` only

## Backend

- **Framework**: FastAPI with async/await throughout
- **Runtime**: Python 3, served via `uvicorn[standard]`
- **ORM / DB driver**: SQLAlchemy 2.0 (sync models), `asyncpg` for async query execution, `psycopg2-binary` for sync scripts
- **LLM orchestration**: LangChain (`langchain`, `langchain-openai`, `langchain-community`)
- **LLM provider**: OpenAI-compatible API (default model: `gpt-4o-mini`)
- **Embeddings**: NVIDIA NIM — `nvidia/llama-nemotron-embed-1b-v2`
- **Reranker**: NVIDIA NIM — `nvidia/llama-nemotron-rerank-1b-v2`
- **Vector store**: PostgreSQL with `pgvector` extension (`rag.schema_embeddings` table)
- **Config**: `pydantic-settings` reading from `backend/.env`

## API Communication

- Vite dev server proxies `/api/*` → `http://localhost:8000`
- Single endpoint consumed by the frontend: `POST /api/query`
- Admin endpoint: `POST /api/admin/refresh-schema`
- Health check: `GET /api/health`

## Environment Variables (backend/.env)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | LLM model name (default: `gpt-4o-mini`) |
| `NVIDIA_API_KEY` | NVIDIA NIM API key for embeddings + reranking |
| `RAG_ENABLED` | Toggle RAG pipeline (default: `true`) |
| `RAG_CANDIDATE_COUNT` | Vector search candidate count (default: 10) |
| `RAG_TOP_K` | Tables passed to LLM after reranking (default: 5) |
| `MAX_RETRIES` | SQL self-correction retry limit (default: 3) |

## Common Commands

### Frontend

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Backend

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start API server (http://localhost:8000)
uvicorn app.main:app --reload --app-dir backend

# Ingest/re-embed database schemas into pgvector
python backend/scripts/ingest_schemas.py

# Set up pgvector extension and rag schema
python backend/scripts/setup_pgvector.py

# Check RAG embedding count
python backend/scripts/check_rag_count.py

# Test vector search
python backend/scripts/test_vector_search.py
```
