# SQL RAG — Executive Sales Intelligence Platform

> Enterprise Text-to-SQL agent with automatic data visualization. Ask a business question in plain English — get SQL, results, an AI summary, and the right chart, automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)
[![Recharts](https://img.shields.io/badge/charts-recharts-22b5bf.svg)](https://recharts.org/)

---

## Overview

SQL RAG transforms natural language questions into accurate PostgreSQL queries using a RAG pipeline, executes them against a live database, and now automatically renders the right analytical chart — bar, line, pie, KPI card, scatter plot — so non-technical users see insights, not raw data.

Built for C-suite and senior management who need instant data answers without writing SQL or configuring dashboards.

---

## What's New — Auto-Visualization (Phase 1)

Every query result now automatically includes a chart chosen by the **Visualization Decision Engine (VDE)** — a deterministic rule-based system that inspects the result shape and picks the best chart type. No configuration required.

| Query type | Auto-selected chart |
|---|---|
| One metric (e.g. total revenue) | KPI card with formatted number |
| Category + one metric | Bar chart |
| Category + 2–4 metrics | Grouped bar chart (dual-Y-axis if scales diverge) |
| Time column + metrics | Line chart (gaps shown for missing periods) |
| Category + metric, ≤ 12 rows | Donut chart |
| Two independent numeric columns | Scatter plot |
| Text-only / ID-only data | Raw data table (graceful fallback) |

Users can switch between the auto-selected chart and raw table view with a single click via the `[ 📊 Chart ] [ 📋 Table ]` toggle on every result card.

---

## Key Features

- 🤖 **Natural Language to SQL** — ask questions in plain English
- 📊 **Auto-Visualization** — deterministic VDE picks the right chart every time
- 🔄 **Chart / Table Toggle** — one-click switch between chart and raw data
- 🔍 **Smart Schema Retrieval** — RAG pipeline selects the top 5 relevant tables from 87
- 🔁 **Self-Correcting Agent** — automatically fixes SQL errors (up to 3 retries)
- 🛡️ **Read-Only Enforcement** — SQL safety guard prevents data modification
- 📝 **Executive Summaries** — AI-generated business narrative for every result
- ⚡ **Fast Response** — 2–3 second end-to-end query time (VDE adds < 10 ms)
- ♿ **Accessible Charts** — IBM Carbon colorblind-safe palette (protanopia + deuteranopia safe)
- 💰 **Cost Effective** — ~$0.0001 per query

---

## Architecture

```
User Question
    │
    ▼
Input Validation
    │
    ▼
NVIDIA NIM Embed API  ──→  pgvector Search (87 tables → Top 10)
                                   │
                                   ▼
                          NVIDIA NIM Reranker  ──→  Top 5 tables
                                   │
                                   ▼
                     Meta Llama 3.3 70B  ──→  SQL Generation
                                   │
                                   ▼
                          PostgreSQL Execution
                                   │
                          ┌────────┴────────┐
                          │  Self-Correction │  (on error, up to 3 retries)
                          └────────┬────────┘
                                   │
                                   ▼
                     Meta Llama 3.3 70B  ──→  Executive Summary
                                   │
                                   ▼
                    Visualization Decision Engine (VDE)
                     • Classify column types via PG OID types
                     • Apply 8 deterministic chart-selection rules
                     • Transform data into chart-ready format
                     • Gap-fill time series, dual-Y-axis detection
                                   │
                                   ▼
                    QueryResponse  { sql, summary, columns, rows,
                                     meta, chart_spec }
                                   │
                                   ▼
                    React Frontend
                     • ChartRouter (lazy-loaded Recharts)
                     • Chart / Table toggle
                     • IntersectionObserver virtualisation
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| Tailwind CSS v4 | Utility-first styling |
| Recharts | Chart rendering (lazy-loaded, ~150 kB) |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI (Python async) | API server |
| asyncpg | Async PostgreSQL driver |
| PostgreSQL + pgvector | Database + vector similarity search |
| NVIDIA NIM — Llama 3.3 70B | SQL generation + summaries |
| NVIDIA NIM — Nemotron Embed 1B | Query embedding |
| NVIDIA NIM — Nemotron Rerank 1B | Schema candidate reranking |
| LangChain | LLM orchestration |

---

## Project Structure

```
SQL_RAG/
├── src/                          # React frontend
│   ├── components/
│   │   ├── charts/               # Auto-visualization components (NEW)
│   │   │   ├── ChartRouter.jsx       # Lazy-loaded dispatcher
│   │   │   ├── ChartToggleBar.jsx    # Chart / Table toggle
│   │   │   ├── ChartVirtualizer.jsx  # IntersectionObserver perf wrapper
│   │   │   ├── ChartErrorBoundary.jsx
│   │   │   ├── ChartSkeleton.jsx     # Loading placeholder
│   │   │   ├── chartTheme.js         # IBM Carbon accessible palette
│   │   │   ├── BarChartView.jsx
│   │   │   ├── LineChartView.jsx
│   │   │   ├── PieChartView.jsx      # Pie + Donut
│   │   │   ├── GroupedBarChartView.jsx  # Supports dual-Y-axis
│   │   │   ├── ScatterChartView.jsx
│   │   │   └── KPICard.jsx           # kpi_card + kpi_multi
│   │   ├── ChatArea.jsx          # Updated: chart wiring + toggle
│   │   ├── DataTable.jsx
│   │   ├── SQLViewer.jsx
│   │   ├── FeedbackButtons.jsx
│   │   └── Sidebar.jsx
│   ├── data/
│   │   ├── apiClient.js
│   │   └── dbSimulator.js        # Updated: passes chart_spec through
│   └── App.jsx                   # Updated: chartSpec on message state
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── llm_client.py
│   │   │   ├── prompts.py
│   │   │   └── sql_agent.py      # Updated: isolated summary + VDE failures
│   │   ├── models/
│   │   │   └── schemas.py        # Updated: ChartSpec models added
│   │   ├── services/
│   │   │   ├── database.py       # Updated: returns pg_column_types
│   │   │   ├── visualization_engine.py   # NEW — VDE
│   │   │   ├── schema_retriever.py
│   │   │   └── vector_search.py
│   │   └── utils/
│   │       └── sql_guard.py
│   └── scripts/
│
├── docs/
│   ├── auto_visualization_plan.md  # Full 4-version architectural plan
│   └── implementation_plan.md
└── README.md
```

---

## Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL with pgvector extension
- NVIDIA NIM API key (free tier available at [build.nvidia.com](https://build.nvidia.com))
- Supabase account (or any PostgreSQL host)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/TarunBhardwaj2903/SQL_RAG.git
cd SQL_RAG
```

### 2. Backend setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
copy backend\.env.example backend\.env
# Edit backend/.env with your credentials
```

### 3. Frontend setup

```bash
npm install
```

### 4. Database setup

```bash
# Set up pgvector extension
python backend/scripts/setup_pgvector.py

# Ingest schema embeddings
python backend/scripts/ingest_schemas.py
```

---

## Configuration

`backend/.env`:

```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# NVIDIA NIM — LLM
OPENAI_API_KEY=nvapi-YOUR-KEY-HERE
OPENAI_API_BASE=https://integrate.api.nvidia.com/v1
OPENAI_MODEL=meta/llama-3.3-70b-instruct

# NVIDIA NIM — Embeddings + Reranking
NVIDIA_API_KEY=nvapi-YOUR-KEY-HERE
NVIDIA_EMBED_MODEL=nvidia/llama-nemotron-embed-1b-v2

# RAG pipeline
RAG_ENABLED=true
RAG_CANDIDATE_COUNT=10
RAG_TOP_K=5

# Agent
MAX_RETRIES=3
LOG_LEVEL=INFO
```

---

## Running the Application

### Backend

```bash
uvicorn app.main:app --reload --app-dir backend
```

Runs at `http://localhost:8000`

### Frontend

```bash
npm run dev
```

Runs at `http://localhost:5173`

---

## API Reference

### POST /api/query

```json
{
  "question": "What are the top 10 products by sales revenue?"
}
```

**Response** (fields added in Phase 1 shown in bold):

```json
{
  "sql": "SELECT p.name, SUM(sod.linetotal) AS revenue ...",
  "summary": "**Top product:** Mountain-200 Black at $1.2M ...",
  "columns": ["name", "revenue"],
  "rows": [["Mountain-200 Black", "1234567.89"], "..."],
  "meta": {
    "execution_ms": 145,
    "rows_returned": 10,
    "tables_scanned": ["production.product", "sales.salesorderdetail"],
    "confidence": 0.95,
    "retries_used": 0
  },
  "chart_spec": {
    "chart_type": "bar",
    "title": "Top 10 Products By Sales Revenue — Bar Chart",
    "x_axis": { "column": "name", "label": "Product Name", "type": "categorical" },
    "y_axis": { "columns": ["revenue"], "labels": ["Revenue"], "unit": "$" },
    "series": [{ "column": "revenue", "name": "Revenue", "data_key": "__y0", "color_index": 0 }],
    "dual_y_axis": false,
    "color_scheme": "accessible",
    "data_transformed": [
      { "__x": "Mountain-200 Black", "__y0": 1234567.89 },
      "..."
    ],
    "data_truncated": false,
    "meta": { "row_count_original": 10, "row_count_rendered": 10, "vde_rule_matched": 6 }
  }
}
```

`chart_spec` is `null` when the data is not chartable (text-only results, ID columns, etc.) — the frontend falls back to the raw data table automatically.

### GET /api/health

```json
{ "status": "healthy" }
```

### POST /api/admin/refresh-schema

Re-embeds all 87 table definitions into pgvector. Run after schema changes.

---

## Example Queries to Test

| Query | Expected chart |
|---|---|
| `What is the total sales revenue by product subcategory?` | Bar chart |
| `Show monthly sales trends by territory group` | Line chart |
| `What percentage of orders came from each territory?` | Donut chart |
| `What is the total number of sales orders?` | KPI card |
| `Compare total sales, total orders, and avg order value by region` | Grouped bar (dual-Y) |
| `Show me all employees in the Sales department` | Table fallback |

---

## Visualization Decision Engine — Rule Summary

The VDE runs synchronously in < 10 ms after query execution. It uses PostgreSQL OID types (extracted before stringification) as the primary signal.

```
Rule 0  rows == 0                                    → empty_state
Rule 1  1 row, 1 numeric column                      → kpi_card
Rule 2  1 row, 2–6 numeric columns                   → kpi_multi
Rule 3  1 categorical + 1 numeric, 2–12 rows         → pie / donut
Rule 4  1 temporal + 1–3 numeric                     → line (+ gap-fill)
Rule 5  1 categorical + 2–4 numeric                  → grouped_bar
Rule 6  1 categorical + 1 numeric, 2–30 rows         → bar
Rule 7  2 numeric, no categorical, ≥ 10 rows         → scatter
Rule 8  everything else                              → table (DataTable)
```

ID columns (`TerritoryID`, `ProductID`, etc.) are excluded from all axis assignments before rules are evaluated.

---

## Performance

| Metric | Value |
|---|---|
| End-to-end response time | 2–3 seconds |
| VDE overhead | < 10 ms |
| Recharts initial bundle impact | 0 kB (lazy-loaded) |
| Recharts chunk size | ~415 kB / 121 kB gzipped |
| Tables in database | 87 |
| Tables sent to LLM | 5 (94% reduction via RAG) |
| Cost per query | ~$0.0001 |
| Self-correction rate | ~10% |

---

## Security

- All secrets in `.env` — never committed
- Read-only SQL enforcement via `sql_guard.py` (blocks INSERT/UPDATE/DELETE/DROP/ALTER)
- Input validation on all query inputs
- SQL injection prevention
- CORS configuration
- VDE and summary failures are fully isolated — a chart error never causes a 500 response

---

## Scripts

```bash
# Check how many schema embeddings are stored
python backend/scripts/check_rag_count.py

# Test vector similarity search
python backend/scripts/test_vector_search.py

# Test NVIDIA NIM model connectivity
python backend/scripts/test_nvidia_models.py

# Test reranker endpoint
python backend/scripts/test_rerank_endpoints.py

# Test domain classifier
python backend/scripts/test_domain_classifier.py
```

---

## Roadmap

- [x] Natural language to SQL with self-correction
- [x] RAG-based schema retrieval (87 tables → Top 5)
- [x] Executive AI summaries
- [x] **Auto-visualization engine (Phase 1)** ← current
- [ ] Conversation memory with session cache (follow-up questions)
- [ ] Power BI MCP integration (Phase 2) — push charts to shared workspace

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: description'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request against `main`

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [NVIDIA NIM](https://build.nvidia.com) — LLM, embeddings, and reranking APIs
- [Supabase](https://supabase.com) — PostgreSQL hosting with pgvector
- [LangChain](https://langchain.com) — LLM orchestration
- [FastAPI](https://fastapi.tiangolo.com) — async Python API framework
- [Recharts](https://recharts.org) — React-native charting library
- [IBM Carbon Design System](https://carbondesignsystem.com) — accessible color palette

---

*Built for making enterprise data accessible to everyone — no SQL required.*
