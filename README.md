# SQL RAG - Natural Language to SQL Query System

> Enterprise-grade Text-to-SQL agent using RAG (Retrieval-Augmented Generation) for intelligent database querying.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)

## 🎯 Overview

SQL RAG transforms natural language questions into accurate SQL queries using a sophisticated RAG pipeline. Built for business users who need data insights without SQL knowledge.

### Key Features

- 🤖 **Natural Language to SQL** - Ask questions in plain English
- 🔍 **Smart Schema Retrieval** - RAG pipeline selects top 5 relevant tables from 87
- 🔄 **Self-Correcting Agent** - Automatically fixes SQL errors (up to 3 retries)
- 🛡️ **Read-Only Enforcement** - SQL safety guard prevents data modification
- 📊 **Executive Summaries** - AI-generated business insights
- ⚡ **Fast Response** - 2-3 second query execution
- 💰 **Cost Effective** - ~$0.0001 per query

## 🏗️ Architecture

```
User Question
    ↓
Input Validation
    ↓
NVIDIA Embed API (Query → Vector)
    ↓
pgvector Search (87 tables → Top 10)
    ↓
Select Top 5 Tables
    ↓
Meta Llama 3.3 70B (Generate SQL)
    ↓
Execute on PostgreSQL
    ↓
Self-Correction (if needed)
    ↓
Generate Summary
    ↓
Return Results
```

## 🚀 Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS v4** for styling
- **Lucide React** for icons

### Backend
- **FastAPI** (Python async)
- **PostgreSQL** with pgvector extension
- **NVIDIA NIM** (Llama 3.3 70B for SQL generation)
- **NVIDIA NIM** (Llama Nemotron Embed for embeddings)
- **LangChain** for LLM orchestration
- **asyncpg** for database operations

## 📋 Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL with pgvector extension
- NVIDIA NIM API key (free tier available)
- Supabase account (or any PostgreSQL database)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/sql-rag.git
cd sql-rag
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### 3. Frontend Setup

```bash
# From project root
npm install
```

### 4. Database Setup

Run the pgvector setup script:

```bash
python backend/scripts/setup_pgvector.py
```

Ingest your database schema:

```bash
python backend/scripts/ingest_schemas.py
```

## 🔑 Configuration

Create `backend/.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# NVIDIA NIM API
OPENAI_API_KEY=nvapi-YOUR-KEY-HERE
OPENAI_API_BASE=https://integrate.api.nvidia.com/v1
OPENAI_MODEL=meta/llama-3.3-70b-instruct

# RAG Settings
NVIDIA_API_KEY=nvapi-YOUR-KEY-HERE
NVIDIA_EMBED_MODEL=nvidia/llama-nemotron-embed-1b-v2
RAG_ENABLED=true
RAG_CANDIDATE_COUNT=10
RAG_TOP_K=5

# Agent Configuration
MAX_RETRIES=3
LOG_LEVEL=INFO
```

**Get API Keys:**
- NVIDIA NIM: https://build.nvidia.com
- Supabase: https://supabase.com/dashboard

## 🎮 Usage

### Start Backend

```bash
cd backend
uvicorn app.main:app --reload --app-dir .
```

Backend runs at: `http://localhost:8000`

### Start Frontend

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Example Queries

```
What are the top 5 products by sales revenue?
Show me monthly sales trends by territory
List all employees in the Sales department
What is the average order value by region?
```

## 📊 API Endpoints

### Query Endpoint

```bash
POST /api/query
Content-Type: application/json

{
  "question": "What are the top 5 products by sales revenue?"
}
```

**Response:**

```json
{
  "sql": "SELECT p.name, SUM(sod.linetotal) AS revenue...",
  "summary": "**Top 5 Products:** The analysis shows...",
  "columns": ["name", "revenue"],
  "rows": [["Product A", "1234567.89"], ...],
  "meta": {
    "execution_ms": 145,
    "rows_returned": 5,
    "tables_scanned": ["production.product", "sales.salesorderdetail"],
    "confidence": 0.95,
    "retries_used": 0
  }
}
```

### Health Check

```bash
GET /api/health
```

## 🔒 Security

- ✅ All secrets in `.env` (never committed)
- ✅ Read-only SQL enforcement
- ✅ Input validation (5-500 characters)
- ✅ SQL injection prevention
- ✅ Dangerous keyword blocking
- ✅ CORS configuration
- ✅ Rate limiting ready (see docs)

## 🧪 Testing

### Test NVIDIA Models

```bash
python backend/scripts/test_nvidia_models.py
```

### Check RAG Embeddings

```bash
python backend/scripts/check_rag_count.py
```

### Test Vector Search

```bash
python backend/scripts/test_vector_search.py
```

## 📈 Performance

| Metric | Value |
|--------|-------|
| Response Time | 2-3 seconds |
| Cost per Query | ~$0.0001 |
| Tables in DB | 87 |
| Tables Sent to LLM | 5 (94% reduction) |
| Accuracy | 90%+ |
| Self-Correction Rate | ~10% |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NVIDIA NIM](https://build.nvidia.com) for LLM and embedding APIs
- [Supabase](https://supabase.com) for PostgreSQL hosting
- [LangChain](https://langchain.com) for LLM orchestration
- [FastAPI](https://fastapi.tiangolo.com) for the backend framework
- [React](https://reactjs.org) and [Vite](https://vitejs.dev) for the frontend

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for making data accessible to everyone**
