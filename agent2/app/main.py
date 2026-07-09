from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from io import StringIO
from pathlib import Path
from typing import AsyncIterator
from pydantic import BaseModel

APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile

from kpi_engine import calculate_kpis, evaluate_thresholds, summarize_kpis
from modeling import DeviationModel, top_deviation_rows
from recommendation import generate_recommendation
from schemas import AnalyzeResponse

BASE_DIR = Path(__file__).resolve().parents[1]
TRAINING_DATA_PATH = BASE_DIR / "data" / "production_daily_dummy.csv"

model = DeviationModel()
model_train_info = {}


class QueryRequest(BaseModel):
    query: str
    sessionId: str | None = None
    model_preference: str | None = "ollama"


def ensure_model_trained() -> None:
    global model_train_info
    if model.is_trained:
        return
    if not TRAINING_DATA_PATH.exists():
        raise RuntimeError(f"Training data not found at: {TRAINING_DATA_PATH}")
    model_train_info = model.train_from_csv(TRAINING_DATA_PATH)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    ensure_model_trained()
    yield


app = FastAPI(
    title="Agent 2 - Production Decision Support",
    version="1.0.0",
    description="Analyze production CSV for KPI, threshold alerts, deviation detection, and recommendations.",
    lifespan=lifespan,
)


@app.post("/query")
async def query_agent(request: QueryRequest):
    if not TRAINING_DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Data CSV tidak ditemukan")

    try:
        import sys
        if str(BASE_DIR) not in sys.path:
            sys.path.insert(0, str(BASE_DIR))
        from data_gateway import load_integrated_csv, generate_agent2_df
        
        df_integrated = load_integrated_csv(str(TRAINING_DATA_PATH))
        df = generate_agent2_df(df_integrated)
    except Exception as e:
        print(f"Gateway error, using raw CSV: {e}")
        df = pd.read_csv(TRAINING_DATA_PATH)

    try:
        ensure_model_trained()
        df_kpi = calculate_kpis(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    summary = summarize_kpis(df_kpi)
    alerts = evaluate_thresholds(summary)

    try:
        df_pred, model_metrics = model.predict_deviation(df_kpi)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    top_deviations = top_deviation_rows(df_pred, top_n=5)

    recommendation = generate_recommendation({
        "summary": summary,
        "alerts": alerts,
        "model_metrics": model_metrics,
        "top_deviations": top_deviations,
    }, model_preference=request.model_preference)

    return {
        "summary": summary,
        "alerts": alerts,
        "model_metrics": model_metrics,
        "top_deviations": top_deviations,
        "recommendation": recommendation,
        # Full tactical report text — consumed by n8n chatbot Agent 2
        "recommendation_report_text": recommendation.get("text", ""),
        "query": request.query,
    }


def _read_csv_upload(file: UploadFile, raw_bytes: bytes) -> pd.DataFrame:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        csv_text = raw_bytes.decode("utf-8-sig")
        df = pd.read_csv(StringIO(csv_text))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail=f"Failed to parse CSV: {exc}"
        ) from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV is empty.")

    return df


from fastapi.responses import PlainTextResponse

@app.post("/report_full", response_class=PlainTextResponse)
async def report_full_agent(request: QueryRequest) -> str:
    """
    Endpoint for frontend injection. Returns full plain text report.
    """
    if not TRAINING_DATA_PATH.exists():
        return "Error: Data CSV tidak ditemukan."

    try:
        import sys
        if str(BASE_DIR) not in sys.path:
            sys.path.insert(0, str(BASE_DIR))
        from data_gateway import load_integrated_csv, generate_agent2_df
        df_integrated = load_integrated_csv(str(TRAINING_DATA_PATH))
        df = generate_agent2_df(df_integrated)
    except Exception as e:
        print(f"[report] Gateway error, using raw CSV: {e}")
        df = pd.read_csv(TRAINING_DATA_PATH)

    try:
        ensure_model_trained()
        df_kpi = calculate_kpis(df)
    except (ValueError, RuntimeError) as exc:
        return f"Error saat menghitung KPI: {exc}"

    summary = summarize_kpis(df_kpi)
    alerts = evaluate_thresholds(summary)

    try:
        df_pred, model_metrics = model.predict_deviation(df_kpi)
    except RuntimeError as exc:
        return f"Error saat prediksi deviasi: {exc}"

    top_deviations = top_deviation_rows(df_pred, top_n=5)

    recommendation = generate_recommendation({
        "summary": summary,
        "alerts": alerts,
        "model_metrics": model_metrics,
        "top_deviations": top_deviations,
    }, model_preference=request.model_preference)
    report_text = recommendation.get("text", "")

    if not report_text:
        report_text = (
            f"Laporan KPI Produksi\n"
            f"OEE rata-rata: {summary.get('avg_oee', 'N/A')}%\n"
            f"Downtime rata-rata: {summary.get('avg_downtime_rate', 'N/A')}%\n"
            f"Defect rata-rata: {summary.get('avg_defect_rate', 'N/A')}%\n"
            f"Jumlah alert aktif: {len(alerts)}"
        )

    return report_text

@app.post("/report")
def generate_report_summary(payload: dict):
    """
    Endpoint khusus untuk Agent 1 (n8n).
    Hanya mengembalikan ringkasan pendek dan token placeholder agar tidak merusak memory LangChain.
    """
    model_preference = payload.get("model_preference", "ollama")
    if not TRAINING_DATA_PATH.exists():
        return {"summary": "Error: Data CSV tidak ditemukan.", "instruction": "Inform user data is missing."}

    try:
        import sys
        if str(BASE_DIR) not in sys.path:
            sys.path.insert(0, str(BASE_DIR))
        from data_gateway import load_integrated_csv, generate_agent2_df
        df_integrated = load_integrated_csv(str(TRAINING_DATA_PATH))
        df = generate_agent2_df(df_integrated)
    except Exception as e:
        df = pd.read_csv(TRAINING_DATA_PATH)

    try:
        ensure_model_trained()
        df_kpi = calculate_kpis(df)
        summary = summarize_kpis(df_kpi)
        alerts = evaluate_thresholds(summary)
    except Exception as exc:
        return {"summary": f"Error saat kalkulasi: {exc}", "instruction": "Inform user of error."}

    return {
        "summary": "KPI report and machine alerts calculated successfully by Agent 2.",
        "instruction": "Reply to the user ONLY with this exact string: [INJECT_REPORT_2]. Do not add any other words, greetings, or formatting."
    }

@app.get("/health")
def health_check() -> dict:
    try:
        ensure_model_trained()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "ok",
        "model_trained": model.is_trained,
        "model_train_info": model_train_info,
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_production_csv(file: UploadFile = File(...)) -> AnalyzeResponse:
    df = _read_csv_upload(file, await file.read())

    try:
        import sys
        if str(BASE_DIR) not in sys.path:
            sys.path.insert(0, str(BASE_DIR))
        from data_gateway import generate_agent2_df
        
        # Convert raw to integrated schema dynamically
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        elif 'date' in df.columns:
            df['timestamp'] = pd.to_datetime(df['date'])
            
        df = generate_agent2_df(df)
    except Exception as e:
        print(f"Gateway error on analyze, using raw dataframe: {e}")

    try:
        ensure_model_trained()
        df_kpi = calculate_kpis(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    summary = summarize_kpis(df_kpi)
    alerts = evaluate_thresholds(summary)

    try:
        df_pred, model_metrics = model.predict_deviation(df_kpi)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    top_deviations = top_deviation_rows(df_pred, top_n=5)

    reasoning_payload = {
        "summary": summary,
        "alerts": alerts,
        "model_metrics": model_metrics,
        "top_deviations": top_deviations,
    }
    recommendation = generate_recommendation(reasoning_payload)

    return AnalyzeResponse(
        summary=summary,
        alerts=alerts,
        model_metrics=model_metrics,
        top_deviations=top_deviations,
        recommendation=recommendation,
        # Full tactical report text — consumed by n8n chatbot Agent 2
        recommendation_report_text=recommendation.get("text", ""),
    )
