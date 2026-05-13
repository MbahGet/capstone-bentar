from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class AlertItem(BaseModel):
    metric: str
    level: str
    message: str


class DeviationItem(BaseModel):
    date: str
    machine_id: str
    oee: float
    downtime_rate: float
    defect_rate: float
    deviation_probability: float
    deviation_flag: int


class Recommendation(BaseModel):
    source: str
    model: Optional[str] = None
    text: str
    error: Optional[str] = None


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    summary: Dict[str, Any]
    alerts: List[AlertItem]
    model_metrics: Dict[str, Any]
    top_deviations: List[DeviationItem]
    recommendation: Recommendation
