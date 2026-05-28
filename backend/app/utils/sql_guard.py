import re
from typing import NamedTuple, Optional

class GuardResult(NamedTuple):
    is_safe: bool
    reason: Optional[str]

BLOCKED_KEYWORDS = [
    r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b", r"\bALTER\b", 
    r"\bTRUNCATE\b", r"\bCREATE\b", r"\bGRANT\b", r"\bREVOKE\b", r"\bEXEC\b",
    r"\bEXECUTE\b", r"\bCOPY\b" # since we don't want COPY statements to be run by the LLM
]

def validate_sql(sql: str) -> GuardResult:
    """
    Validate if a generated SQL query is safe (read-only).
    Checks for blacklisted SQL commands.
    """
    # Remove SQL comments to avoid blocked words inside comments blocking a valid query
    # E.g. "-- This doesn't UPDATE anything"
    cleaned_sql = re.sub(r'--.*?\n', '\n', sql)
    cleaned_sql = re.sub(r'/\*.*?\*/', '', cleaned_sql, flags=re.DOTALL)
    
    upper_sql = cleaned_sql.upper()

    for pattern in BLOCKED_KEYWORDS:
        if re.search(pattern, upper_sql):
            keyword = pattern.replace(r"\b", "")
            return GuardResult(
                is_safe=False,
                reason=f"Blocked keyword detected: {keyword}"
            )

    # Check if the query is a SELECT query (or CTE starting with WITH)
    trimmed_sql = upper_sql.strip()
    if not (trimmed_sql.startswith("SELECT") or trimmed_sql.startswith("WITH") or trimmed_sql.startswith("SHOW")):
        return GuardResult(
            is_safe=False,
            reason="Query must start with SELECT or WITH"
        )

    return GuardResult(is_safe=True, reason=None)
