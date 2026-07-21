import logging
import re
from typing import List, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from app.config import settings
from app.agents.prompts import (
    SQL_SYSTEM_PROMPT, SQL_USER_PROMPT,
    ERROR_CORRECTION_SYSTEM_PROMPT, ERROR_CORRECTION_USER_PROMPT,
    SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT,
)

logger = logging.getLogger(__name__)


def extract_sql_code(text: str) -> str:
    """Extract SQL statement from markdown code block if present."""
    match = re.search(r"```sql\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()

    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    return text.strip()


class LLMClient:
    def __init__(self):
        api_key = settings.OPENAI_API_KEY if settings.OPENAI_API_KEY != "your_openai_api_key_here" else None
        api_base = settings.OPENAI_API_BASE or "https://integrate.api.nvidia.com/v1"

        self.llm_sql = ChatOpenAI(
            api_key=api_key,
            base_url=api_base,
            model=settings.OPENAI_MODEL,
            temperature=0.0,
            request_timeout=90,   # 90s max for SQL generation
        )
        self.llm_summary = ChatOpenAI(
            api_key=api_key,
            base_url=api_base,
            model=settings.OPENAI_MODEL,
            temperature=0.3,
            request_timeout=45,   # 45s max for summary (has fallback)
        )

    def _build_messages(self, system_text: str, user_text: str, chat_history: List) -> List:
        """
        Build a LangChain message list — the ONLY place history is injected.

        Layout:
          [SystemMessage(system_text)]
          [HumanMessage | AIMessage] * len(chat_history)   ← prior turns
          [HumanMessage(user_text)]                         ← current question

        Assistant turns embed both the plain-text summary (content) and,
        when available, the SQL that was executed — giving the model full
        context to write consistent follow-up queries.

        History is injected ONCE here and nowhere else (no duplicate in system prompt).
        """
        messages = [SystemMessage(content=system_text)]

        for turn in chat_history:
            if turn.role == "user":
                messages.append(HumanMessage(content=turn.content))
            else:
                # Combine summary + SQL so the model can reference the exact prior query
                assistant_content = turn.content
                if turn.sql:
                    assistant_content += f"\n\nSQL used in this answer:\n```sql\n{turn.sql}\n```"
                messages.append(AIMessage(content=assistant_content))

        messages.append(HumanMessage(content=user_text))
        return messages

    async def generate_sql(
        self,
        question: str,
        schema_context: str,
        chat_history: List = None,
    ) -> str:
        """Generate SQL for a question, injecting prior conversation turns for follow-up support."""
        if chat_history is None:
            chat_history = []

        system_text = SQL_SYSTEM_PROMPT.format(schema_context=schema_context)
        user_text   = SQL_USER_PROMPT.format(question=question)

        messages = self._build_messages(system_text, user_text, chat_history)
        response = await self.llm_sql.ainvoke(messages)

        sql = extract_sql_code(response.content)
        logger.info(f"Generated SQL: {sql}")
        return sql

    async def fix_sql(
        self,
        failed_sql: str,
        error_message: str,
        schema_context: str,
    ) -> str:
        """Fix a failed SQL query.
        
        History is intentionally excluded: only the schema + error message
        are needed to correct a syntax / semantic execution failure.
        """
        system_text = ERROR_CORRECTION_SYSTEM_PROMPT.format(schema_context=schema_context)
        user_text   = ERROR_CORRECTION_USER_PROMPT.format(
            failed_sql=failed_sql,
            error_message=error_message,
        )
        messages = [SystemMessage(content=system_text), HumanMessage(content=user_text)]
        response = await self.llm_sql.ainvoke(messages)

        fixed_sql = extract_sql_code(response.content)
        logger.info(f"Corrected SQL: {fixed_sql}")
        return fixed_sql

    async def generate_summary(
        self,
        question: str,
        sql: str,
        columns: List[str],
        rows: List[List[Any]],
        chat_history: List = None,
    ) -> str:
        """Generate an executive summary, referencing prior conversation where relevant."""
        if chat_history is None:
            chat_history = []

        sample_rows = "\n".join([str(row) for row in rows[:5]]) or "No rows returned."

        system_text = SUMMARY_SYSTEM_PROMPT  # No placeholders — static prompt
        user_text   = SUMMARY_USER_PROMPT.format(
            question=question,
            sql=sql,
            columns=str(columns),
            sample_rows=sample_rows,
        )

        messages = self._build_messages(system_text, user_text, chat_history)
        response = await self.llm_summary.ainvoke(messages)

        return response.content.strip()
