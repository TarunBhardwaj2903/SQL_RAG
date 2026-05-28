# Project Structure

This is a monorepo with a React frontend at the root and a Python backend under `backend/`.

```
SQL_RAG/
├── src/                        # React frontend source
│   ├── components/             # UI components (pure presentational + light logic)
│   │   ├── ChatArea.jsx        # Message thread renderer
│   │   ├── DataTable.jsx       # Query results table
│   │   ├── FeedbackButtons.jsx # Thumbs up/down controls
│   │   ├── FeedbackDashboard.jsx
│   │   ├── FeedbackModal.jsx
│   │   ├── Sidebar.jsx         # Query history sidebar
│   │   └── SQLViewer.jsx       # Syntax-highlighted SQL display
│   ├── data/                   # Data layer / API clients
│   │   ├── apiClient.js        # fetch wrapper for POST /api/query
│   │   ├── dbSimulator.js      # Mock data for offline/dev use
│   │   ├── feedbackStore.jsx   # React context + reducer for feedback state
│   │   └── feedbackStore.js    # (legacy duplicate — prefer .jsx)
│   ├── App.jsx                 # Root component, owns all top-level state
│   ├── App.css
│   ├── main.jsx                # ReactDOM.createRoot entry point
│   └── index.css
├── public/
├── backend/
│   ├── app/
│   │   ├── agents/             # LLM interaction layer
│   │   │   ├── llm_client.py   # LLMClient: generate_sql, fix_sql, generate_summary
│   │   │   ├── prompts.py      # All prompt templates (system + user)
│   │   │   └── sql_agent.py    # execute_with_self_correction() orchestrator
│   │   ├── models/
│   │   │   └── schemas.py      # Pydantic models: QueryRequest, QueryResponse, QueryMeta
│   │   ├── routers/
│   │   │   └── query.py        # POST /api/query, POST /api/admin/refresh-schema
│   │   ├── services/
│   │   │   ├── database.py     # asyncpg connection pool, execute_query()
│   │   │   ├── embedding_service.py   # NVIDIA NIM embed API wrapper
│   │   │   ├── reranker_service.py    # NVIDIA NIM rerank API wrapper
│   │   │   ├── schema_ingestor.py     # Introspects DB → embeds → stores in pgvector
│   │   │   ├── schema_retriever.py    # RAG pipeline: embed → vector search → rerank
│   │   │   └── vector_search.py       # pgvector similarity search queries
│   │   ├── utils/
│   │   │   └── sql_guard.py    # Blocklist validator — enforces read-only SQL
│   │   ├── config.py           # pydantic-settings Settings class
│   │   └── main.py             # FastAPI app, lifespan, CORS, router registration
│   ├── scripts/                # One-off admin / setup scripts (run directly with python)
│   │   ├── setup_pgvector.py
│   │   ├── ingest_schemas.py
│   │   ├── check_rag_count.py
│   │   └── test_vector_search.py
│   ├── requirements.txt
│   └── .env                    # Secret config — never commit
├── index.html                  # Vite HTML entry
├── vite.config.js              # Vite + Tailwind + /api proxy config
├── package.json
└── eslint.config.js
```

## Key Architectural Conventions

### Backend
- All database I/O is **async** (`asyncpg`). Never use blocking calls inside FastAPI route handlers or services.
- Business logic lives in `agents/` and `services/`. Routers are thin — they only validate input, call the agent, and return the response.
- All prompt strings are centralised in `agents/prompts.py`. Do not inline prompts elsewhere.
- `config.py` is the single source of truth for settings. Access via the `settings` singleton — never read `os.environ` directly.
- `sql_guard.py` must be called before every query execution. Do not bypass it.
- The RAG pipeline in `schema_retriever.py` has a full-schema fallback for when `RAG_ENABLED=false` or vector search returns no results.
- Schema embeddings are stored in the `rag` PostgreSQL schema. The `rag.schema_embeddings` table is populated by `schema_ingestor.py` (auto-triggered on startup if empty).

### Frontend
- `App.jsx` owns all top-level state (`messages`, `history`, `isQuerying`). Components receive data and callbacks via props.
- `FeedbackProvider` (from `feedbackStore.jsx`) wraps the entire app — use `useContext` to access feedback state in any component.
- `dbSimulator.js` provides mock responses for frontend development without a running backend. `apiClient.js` is the real backend client.
- Tailwind utility classes are used directly on JSX elements. No custom CSS classes unless absolutely necessary.
- Use `lucide-react` for all icons — do not add other icon libraries.
