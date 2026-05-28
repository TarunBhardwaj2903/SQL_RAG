import logging
import re
from typing import List, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.agents.prompts import (
    SQL_SYSTEM_PROMPT, SQL_USER_PROMPT,
    ERROR_CORRECTION_SYSTEM_PROMPT, ERROR_CORRECTION_USER_PROMPT,
    SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT
)

logger = logging.getLogger(__name__)

def extract_sql_code(text: str) -> str:
    """Extract SQL statement from markdown code block if present."""
    # Match ```sql ... ```
    match = re.search(r"```sql\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    
    # Match generic ``` ... ```
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
        
    return text.strip()

class LLMClient:
    def __init__(self):
        # Initialize OpenAI Chat model pointing to NVIDIA NIM
        api_key = settings.OPENAI_API_KEY if settings.OPENAI_API_KEY != "your_openai_api_key_here" else None
        
        # Use NVIDIA NIM base URL if configured
        if settings.OPENAI_API_BASE:
            api_base = settings.OPENAI_API_BASE
        else:
            api_base = "https://integrate.api.nvidia.com/v1"
        
        self.llm_sql = ChatOpenAI(
            api_key=api_key,
            base_url=api_base,
            model=settings.OPENAI_MODEL,
            temperature=0.0
        )
        self.llm_summary = ChatOpenAI(
            api_key=api_key,
            base_url=api_base,
            model=settings.OPENAI_MODEL,
            temperature=0.3
        )

    async def generate_sql(self, question: str, schema_context: str) -> str:
        """Generate a SQL query for the given question and schema context."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", SQL_SYSTEM_PROMPT),
            ("user", SQL_USER_PROMPT)
        ])
        
        chain = prompt | self.llm_sql
        response = await chain.ainvoke({
            "schema_context": schema_context,
            "question": question
        })
        
        sql = extract_sql_code(response.content)
        # Strip trailing semicolon if present to prevent syntax errors during parsing if needed, 
        # but PostgreSQL handles them fine.
        logger.info(f"Generated SQL: {sql}")
        return sql

    async def fix_sql(self, failed_sql: str, error_message: str, schema_context: str) -> str:
        """Fix a failed SQL query using the database error message."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", ERROR_CORRECTION_SYSTEM_PROMPT),
            ("user", ERROR_CORRECTION_USER_PROMPT)
        ])
        
        chain = prompt | self.llm_sql
        response = await chain.ainvoke({
            "schema_context": schema_context,
            "failed_sql": failed_sql,
            "error_message": error_message
        })
        
        fixed_sql = extract_sql_code(response.content)
        logger.info(f"Corrected SQL: {fixed_sql}")
        return fixed_sql

    async def generate_summary(self, question: str, sql: str, columns: List[str], rows: List[List[Any]]) -> str:
        """Generate a text summary of the SQL query results."""
        # Convert first 10 rows to a string representation for LLM context
        sample_rows = "\n".join([str(row) for row in rows[:10]])
        if not sample_rows:
            sample_rows = "No rows returned."

        prompt = ChatPromptTemplate.from_messages([
            ("system", SUMMARY_SYSTEM_PROMPT),
            ("user", SUMMARY_USER_PROMPT)
        ])
        
        chain = prompt | self.llm_summary
        response = await chain.ainvoke({
            "question": question,
            "sql": sql,
            "columns": str(columns),
            "sample_rows": sample_rows
        })
        
        return response.content.strip()
