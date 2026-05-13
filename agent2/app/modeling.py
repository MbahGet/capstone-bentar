from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from xgboost import XGBClassifier

from kpi_engine import calculate_kpis

FEATURE_COLUMNS = [
    "planned_production_time_min",
    "operating_time_min",
    "total_units",
    "defect_units",
    "ideal_cycle_time_min",
    "oee",
    "downtime_rate",
    "defect_rate",
]


class DeviationModel:
    def __init__(self) -> None:
        self.model = XGBClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=42,
        )
        self.is_trained = False

    @staticmethod
    def _build_target(df_kpi: pd.DataFrame) -> pd.Series:
        return (
            (df_kpi["oee"] < 78.0)
            | (df_kpi["defect_rate"] > 3.5)
            | (df_kpi["downtime_rate"] > 18.0)
        ).astype(int)

    def train_from_csv(self, csv_path: Path) -> Dict[str, float]:
        df = pd.read_csv(csv_path)
        df_kpi = calculate_kpis(df)

        y = self._build_target(df_kpi)
        X = df_kpi[FEATURE_COLUMNS]

        self.model.fit(X, y)
        self.is_trained = True

        train_accuracy = float((self.model.predict(X) == y).mean())
        return {
            "train_rows": int(len(df_kpi)),
            "positive_class_rate": round(float(y.mean()), 4),
            "train_accuracy": round(train_accuracy, 4),
        }

    def predict_deviation(self, df_kpi: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, float]]:
        if not self.is_trained:
            raise RuntimeError("Deviation model has not been trained.")

        X = df_kpi[FEATURE_COLUMNS]
        probs = self.model.predict_proba(X)[:, 1]
        labels = (probs >= 0.5).astype(int)

        output = df_kpi.copy()
        output["deviation_probability"] = probs
        output["deviation_flag"] = labels

        metrics = {
            "deviation_count": int(labels.sum()),
            "deviation_ratio": round(float(labels.mean()), 4),
            "max_deviation_probability": round(float(probs.max()), 4),
        }
        return output, metrics


def top_deviation_rows(df_pred: pd.DataFrame, top_n: int = 5) -> List[Dict[str, float]]:
    cols = [
        "date",
        "machine_id",
        "oee",
        "downtime_rate",
        "defect_rate",
        "deviation_probability",
        "deviation_flag",
    ]

    top_df = df_pred.sort_values("deviation_probability", ascending=False).head(top_n)
    records: List[Dict[str, float]] = []
    for row in top_df[cols].to_dict(orient="records"):
        records.append(
            {
                "date": str(row["date"]),
                "machine_id": str(row["machine_id"]),
                "oee": round(float(row["oee"]), 2),
                "downtime_rate": round(float(row["downtime_rate"]), 2),
                "defect_rate": round(float(row["defect_rate"]), 2),
                "deviation_probability": round(float(row["deviation_probability"]), 4),
                "deviation_flag": int(row["deviation_flag"]),
            }
        )

    return records
