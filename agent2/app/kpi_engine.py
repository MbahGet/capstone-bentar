from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List

import numpy as np
import pandas as pd

EPS = 1e-9

REQUIRED_COLUMNS = {
    "date",
    "machine_id",
    "planned_production_time_min",
    "operating_time_min",
    "total_units",
    "defect_units",
    "ideal_cycle_time_min",
}

NUMERIC_COLUMNS = {
    "planned_production_time_min",
    "operating_time_min",
    "total_units",
    "defect_units",
    "ideal_cycle_time_min",
}

NUMERIC_DTYPES = {column: "float64" for column in NUMERIC_COLUMNS}


@dataclass(frozen=True)
class Thresholds:
    min_oee: float = 80.0
    max_downtime_rate: float = 15.0
    max_defect_rate: float = 3.0


DEFAULT_THRESHOLDS = Thresholds()


@dataclass(frozen=True)
class ValidationRule:
    message: str
    is_invalid: Callable[[pd.DataFrame], pd.Series]


VALIDATION_RULES = (
    ValidationRule(
        "planned_production_time_min must be > 0",
        lambda df: df["planned_production_time_min"] <= 0,
    ),
    ValidationRule(
        "operating_time_min must be >= 0",
        lambda df: df["operating_time_min"] < 0,
    ),
    ValidationRule(
        "operating_time_min cannot exceed planned_production_time_min",
        lambda df: df["operating_time_min"] > df["planned_production_time_min"],
    ),
    ValidationRule("total_units must be > 0", lambda df: df["total_units"] <= 0),
    ValidationRule("defect_units must be >= 0", lambda df: df["defect_units"] < 0),
    ValidationRule(
        "defect_units cannot exceed total_units",
        lambda df: df["defect_units"] > df["total_units"],
    ),
    ValidationRule(
        "ideal_cycle_time_min must be > 0",
        lambda df: df["ideal_cycle_time_min"] <= 0,
    ),
)


def validate_input_schema(df: pd.DataFrame) -> None:
    missing = REQUIRED_COLUMNS.difference(df.columns)
    if missing:
        missing_text = ", ".join(sorted(missing))
        raise ValueError(f"CSV missing required columns: {missing_text}")

    invalid_numeric = [
        column
        for column in sorted(NUMERIC_COLUMNS)
        if pd.to_numeric(df[column], errors="coerce").isna().any()
    ]
    if invalid_numeric:
        invalid_text = ", ".join(invalid_numeric)
        raise ValueError(f"CSV columns must be numeric: {invalid_text}")


def _coerce_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    try:
        return df.astype(NUMERIC_DTYPES)
    except ValueError as exc:
        raise ValueError("CSV columns must contain valid numeric values.") from exc


def _validate_business_rules(df: pd.DataFrame) -> None:
    failed_rules = [rule.message for rule in VALIDATION_RULES if rule.is_invalid(df).any()]
    if failed_rules:
        raise ValueError(
            "CSV contains invalid production values: " + "; ".join(failed_rules)
        )


def _safe_div(num: pd.Series, den: pd.Series) -> pd.Series:
    return num / (den + EPS)


def calculate_kpis(df: pd.DataFrame) -> pd.DataFrame:
    validate_input_schema(df)

    result = _coerce_numeric_columns(df.copy())
    _validate_business_rules(result)

    result["downtime_min"] = (
        result["planned_production_time_min"] - result["operating_time_min"]
    ).clip(lower=0)

    availability = _safe_div(
        result["operating_time_min"], result["planned_production_time_min"]
    )
    performance = _safe_div(
        result["ideal_cycle_time_min"] * result["total_units"],
        result["operating_time_min"],
    )
    quality = _safe_div(
        (result["total_units"] - result["defect_units"]).clip(lower=0),
        result["total_units"],
    )

    result["availability"] = np.clip(availability, 0.0, 1.0)
    result["performance"] = np.clip(performance, 0.0, 1.3)
    result["quality"] = np.clip(quality, 0.0, 1.0)
    result["oee"] = result["availability"] * result["performance"] * result["quality"] * 100
    result["downtime_rate"] = (
        _safe_div(result["downtime_min"], result["planned_production_time_min"]) * 100
    )
    result["defect_rate"] = _safe_div(result["defect_units"], result["total_units"]) * 100

    return result


def summarize_kpis(df_kpi: pd.DataFrame) -> Dict[str, float]:
    summary = df_kpi.agg(
        {
            "oee": "mean",
            "downtime_rate": "mean",
            "defect_rate": "mean",
            "downtime_min": "sum",
            "total_units": "sum",
            "defect_units": "sum",
        }
    )

    return {
        "avg_oee": round(float(summary["oee"]), 2),
        "avg_downtime_rate": round(float(summary["downtime_rate"]), 2),
        "avg_defect_rate": round(float(summary["defect_rate"]), 2),
        "total_downtime_min": round(float(summary["downtime_min"]), 2),
        "total_production_units": int(summary["total_units"]),
        "total_defect_units": int(summary["defect_units"]),
    }


def evaluate_thresholds(
    summary: Dict[str, float], thresholds: Thresholds = DEFAULT_THRESHOLDS
) -> List[Dict[str, str]]:
    alerts: List[Dict[str, str]] = []

    if summary["avg_oee"] < thresholds.min_oee:
        alerts.append(
            {
                "metric": "oee",
                "level": "high",
                "message": f"OEE {summary['avg_oee']}% < {thresholds.min_oee}%",
            }
        )

    if summary["avg_downtime_rate"] > thresholds.max_downtime_rate:
        alerts.append(
            {
                "metric": "downtime_rate",
                "level": "medium",
                "message": (
                    f"Downtime rate {summary['avg_downtime_rate']}% > "
                    f"{thresholds.max_downtime_rate}%"
                ),
            }
        )

    if summary["avg_defect_rate"] > thresholds.max_defect_rate:
        alerts.append(
            {
                "metric": "defect_rate",
                "level": "high",
                "message": (
                    f"Defect rate {summary['avg_defect_rate']}% > "
                    f"{thresholds.max_defect_rate}%"
                ),
            }
        )

    return alerts
