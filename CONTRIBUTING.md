# Contributing to SQL RAG

Thank you for your interest in contributing to SQL RAG! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**Bug Report Template:**

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11]
- Python version: [e.g., 3.12]
- Node version: [e.g., 18.0]
- Browser: [e.g., Chrome 120]

**Additional context**
Any other relevant information.
```

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- Clear description of the enhancement
- Use cases and benefits
- Potential implementation approach
- Any relevant examples or mockups

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/sql-rag.git
   cd sql-rag
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Include screenshots if UI changes

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL with pgvector
- NVIDIA NIM API key

### Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/sql-rag.git
   cd sql-rag
   
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend
   cd ..
   npm install
   ```

2. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your credentials
   ```

3. **Run development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn app.main:app --reload --app-dir .
   
   # Terminal 2 - Frontend
   npm run dev
   ```

## Code Style Guidelines

### Python (Backend)

- Follow [PEP 8](https://pep8.org/)
- Use type hints
- Maximum line length: 100 characters
- Use docstrings for functions and classes

**Example:**

```python
async def execute_query(self, sql: str) -> Tuple[List[str], List[List[Any]], int]:
    """
    Execute a SQL query and return results.
    
    Args:
        sql: The SQL query to execute
        
    Returns:
        Tuple of (columns, rows, execution_time_ms)
        
    Raises:
        asyncpg.PostgresError: If query execution fails
    """
    # Implementation
```

### JavaScript/React (Frontend)

- Use ES6+ features
- Functional components with hooks
- Use meaningful variable names
- Maximum line length: 100 characters

**Example:**

```javascript
const handleQuery = useCallback(async (query) => {
  if (!query.trim()) return;
  
  try {
    const result = await queryBackend(query);
    setMessages(prev => [...prev, result]);
  } catch (error) {
    console.error('Query failed:', error);
  }
}, []);
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Examples:**

```
feat: add rate limiting to query endpoint
fix: resolve SQL injection vulnerability
docs: update installation instructions
refactor: optimize vector search performance
```

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
npm test
```

### Security Tests

```bash
# Python dependencies
pip install safety
safety check -r backend/requirements.txt

# Node dependencies
npm audit
```

## Documentation

- Update README.md for user-facing changes
- Update code comments for implementation changes
- Add docstrings for new functions/classes
- Update API documentation for endpoint changes

## Project Structure

```
sql-rag/
├── backend/
│   ├── app/
│   │   ├── agents/       # LLM interaction
│   │   ├── models/       # Pydantic schemas
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── scripts/          # Admin scripts
├── src/
│   ├── components/       # React components
│   └── data/            # API clients
└── docs/                # Documentation (gitignored)
```

## Areas for Contribution

### High Priority

- [ ] Add rate limiting
- [ ] Implement API key authentication
- [ ] Add comprehensive test suite
- [ ] Improve error handling
- [ ] Add request logging

### Medium Priority

- [ ] Add Redis caching
- [ ] Optimize database queries
- [ ] Add query result pagination
- [ ] Improve UI/UX
- [ ] Add dark mode

### Low Priority

- [ ] Add more LLM providers
- [ ] Support multiple databases
- [ ] Add query history
- [ ] Add export functionality
- [ ] Add visualization charts

## Questions?

Feel free to open an issue with the `question` label if you need help or clarification.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SQL RAG! 🎉
