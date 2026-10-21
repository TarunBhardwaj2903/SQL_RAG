import io
import uuid
import logging
from pathlib import Path
import pandas as pd
from fastapi import APIRouter, File, UploadFile, HTTPException

from app.models.file_schemas import UploadResponse, AnalyzeRequest, AnalyzeResponse
from app.services.file_session_store import create_session, get_session
from app.agents.file_analysis_agent import analyze_file_data

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def smart_detect_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """
    CSVs read date/time columns as 'object'. Try converting object columns
    to datetime; if >=80% of non-null values parse successfully, reclassify.
    """
    for col in df.select_dtypes(include="object").columns:
        try:
            converted = pd.to_datetime(df[col], errors="coerce", format="mixed")
            non_null_count = df[col].notna().sum()
            if non_null_count > 0:
                success_rate = converted.notna().sum() / non_null_count
                if success_rate >= 0.8:
                    df[col] = converted
        except Exception:
            pass
    return df


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts CSV or Excel upload (max 10MB). Parses schema,
    stores dataframe in-memory session, and returns initial metadata.
    """
    filename = file.filename or "uploaded_file.csv"
    ext = Path(filename).suffix.lower()

    if ext not in {".csv", ".xlsx"}:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx) file."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds the 10 MB limit."
        )

    try:
        buf = io.BytesIO(content)
        if ext == ".csv":
            df = pd.read_csv(buf)
        else:
            df = pd.read_excel(buf, engine="openpyxl")
    except Exception as e:
        logger.error(f"Failed to parse upload file '{filename}': {e}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse the uploaded file. Please ensure it is a valid {ext.upper()} file."
        )

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="The uploaded file contains no data (0 rows)."
        )

    df = smart_detect_dtypes(df)

    session_id = str(uuid.uuid4())
    columns = [str(c) for c in df.columns]
    dtypes = {str(c): str(df[c].dtype) for c in df.columns}

    # Extract first 5 rows converted to JSON-serializable Python types
    sample_df = df.head(5).copy()
    for col in sample_df.columns:
        if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
            sample_df[col] = sample_df[col].dt.strftime("%Y-%m-%d %H:%M:%S")
    
    sample_rows = sample_df.where(pd.notnull(sample_df), None).values.tolist()

    create_session(
        session_id=session_id,
        df=df,
        filename=filename,
        columns=columns,
        dtypes=dtypes,
        sample_rows=sample_rows,
        row_count=len(df)
    )

    return UploadResponse(
        session_id=session_id,
        filename=filename,
        row_count=len(df),
        columns=columns,
        dtypes=dtypes,
        sample_rows=sample_rows
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_file(request: AnalyzeRequest):
    """
    Analyzes an uploaded file session based on a natural language prompt.
    Generates a transformation spec via NVIDIA LLM, executes with pandas,
    and returns chart specs + business insights.
    """
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    session_data = get_session(request.session_id)

    try:
        response = await analyze_file_data(session_data, prompt)
        return response
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error during file analysis for session {request.session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while analyzing your file data. Please check your prompt and try again."
        )
