import json
import re
import logging
from typing import Tuple, Dict, Any
from fastapi import HTTPException
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.models.file_schemas import TransformationSpec, AnalyzeResponse
from app.agents.file_prompts import FILE_ANALYSIS_SYSTEM_PROMPT, FILE_ANALYSIS_USER_PROMPT
from app.services.pandas_executor import execute_transformation, build_chart_spec

logger = logging.getLogger(__name__)


def extract_json(text: str) -> dict:
    """
    Try 3 strategies to extract JSON from LLM output.
    8B model sometimes wraps in ```json ... ``` fences or adds text before/after.
    """
    cleaned = text.strip()
    # Strategy 1: Direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Extract from markdown code fences
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # Strategy 3: Find first { ... } block
    block_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if block_match:
        try:
            return json.loads(block_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM output: {cleaned[:100]}...")


def get_file_llm_client() -> ChatOpenAI:
    api_key = settings.OPENAI_API_KEY if settings.OPENAI_API_KEY != "your_openai_api_key_here" else None
    api_base = settings.OPENAI_API_BASE or "https://integrate.api.nvidia.com/v1"
    model = settings.OPENAI_MODEL

    return ChatOpenAI(
        api_key=api_key,
        base_url=api_base,
        model=model,
        temperature=0.0,
        request_timeout=60,
    )


async def generate_transformation_spec(
    prompt: str,
    columns: list,
    dtypes: dict,
    sample_rows: list
) -> TransformationSpec:
    """Calls NVIDIA NIM LLM to generate the TransformationSpec JSON."""
    llm = get_file_llm_client()

    schema_lines = [f"Column: '{col}' | Type: '{dtypes.get(col, 'unknown')}'" for col in columns]
    schema_block = "\n".join(schema_lines)
    sample_block = json.dumps(sample_rows, indent=2)

    sys_msg = FILE_ANALYSIS_SYSTEM_PROMPT.format(
        schema_block=schema_block,
        sample_block=sample_block
    )
    user_msg = FILE_ANALYSIS_USER_PROMPT.format(prompt=prompt)

    messages = [
        SystemMessage(content=sys_msg),
        HumanMessage(content=user_msg)
    ]

    # Attempt 1
    try:
        response = await llm.ainvoke(messages)
        content = response.content
        spec_dict = extract_json(content)
        return TransformationSpec.model_validate(spec_dict)
    except Exception as e:
        logger.warning(f"Attempt 1 failed to generate/parse transformation spec: {e}. Retrying once...")
        
        # Retry with direct system correction prompt
        retry_messages = [
            SystemMessage(content=sys_msg),
            HumanMessage(content=user_msg),
            SystemMessage(content="CRITICAL: Your previous response was invalid. Return ONLY a single raw JSON object with no markdown fences, explanations, or extra characters.")
        ]
        try:
            response = await llm.ainvoke(retry_messages)
            spec_dict = extract_json(response.content)
            return TransformationSpec.model_validate(spec_dict)
        except Exception as retry_err:
            logger.error(f"Attempt 2 also failed: {retry_err}")
            raise HTTPException(
                status_code=422,
                detail="The AI assistant could not generate a valid analysis plan for your prompt. Please try rephrasing your request."
            )


async def analyze_file_data(
    session_data: dict,
    prompt: str
) -> AnalyzeResponse:
    """Full orchestration: LLM call → transformation spec → pandas execution → ChartSpec."""
    df = session_data["df"]
    columns = session_data["columns"]
    dtypes = session_data["dtypes"]
    sample_rows = session_data["sample_rows"]
    original_row_count = session_data["row_count"]

    spec = await generate_transformation_spec(prompt, columns, dtypes, sample_rows)
    spec_dict = spec.model_dump()

    res_df, x_col, y_col, final_chart_type = execute_transformation(spec, df)

    chart_spec = build_chart_spec(
        spec=spec,
        result_df=res_df,
        x_col=x_col,
        y_col_or_cols=y_col,
        final_chart_type=final_chart_type,
        original_row_count=original_row_count
    )

    return AnalyzeResponse(
        chart_spec=chart_spec,
        insight=spec.insight,
        rows_analyzed=original_row_count,
        spec_used=spec_dict
    )
