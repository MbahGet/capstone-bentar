from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from io import StringIO
from pathlib import Path
from typing import AsyncIterator

# ── make sure the app/ folder is always on sys.path ──────────────────────────
APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))
# ─────────────────────────────────────────────────────────────────────────────

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


def _read_csv_upload(file: UploadFile, raw_bytes: bytes) -> pd.DataFrame:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        csv_text = raw_bytes.decode("utf-8-sig")
        df = pd.read_csv(StringIO(csv_text))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV is empty.")

    return df


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
    )