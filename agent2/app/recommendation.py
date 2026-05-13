from __future__ import annotations

import json
from typing import Any, Dict, List

from openai import OpenAI

from settings import get_settings


def _fallback_recommendation(payload: Dict[str, Any]) -> str:
    alerts = payload.get("alerts", [])
    summary = payload.get("summary", {})

    actions: List[str] = []
    if any(a.get("metric") == "oee" for a in alerts):
        actions.append("Prioritaskan quick-loss analysis pada line dengan OEE terendah dan lakukan kaizen harian.")
    if any(a.get("metric") == "downtime_rate" for a in alerts):
        actions.append("Jadwalkan preventive maintenance tambahan dan cek top 3 penyebab downtime tiap shift.")
    if any(a.get("metric") == "defect_rate" for a in alerts):
        actions.append("Perketat first-piece inspection serta validasi parameter proses pada mesin dengan defect tertinggi.")

    if not actions:
        actions.append("KPI masih dalam batas aman. Lanjutkan monitoring harian dan audit mingguan untuk menjaga stabilitas proses.")

    return (
        "Rekomendasi otomatis (fallback):\n"
        f"- Ringkasan KPI: OEE {summary.get('avg_oee')}%, "
        f"Downtime {summary.get('avg_downtime_rate')}%, "
        f"Defect {summary.get('avg_defect_rate')}%\n"
        + "\n".join(f"- {item}" for item in actions)
    )


def generate_recommendation(payload: Dict[str, Any]) -> Dict[str, Any]:
    settings = get_settings()
    api_key = settings.ollama_api_key  # ← ubah dari openai_api_key
    base_url = settings.ollama_base_url  # ← tambah ini
    model_name = settings.ollama_model  # ← ubah dari openai_model

    if not api_key:
        return {
            "source": "fallback",
            "model": None,
            "text": _fallback_recommendation(payload),
        }

    prompt = (
        "Anda adalah AI industrial operations advisor. "
        "Berikan rekomendasi tindakan yang konkret, prioritas tinggi ke rendah, "
        "singkat, dan bisa dieksekusi supervisor produksi. "
        "Gunakan bahasa Indonesia profesional.\n\n"
        f"Input analisis: {json.dumps(payload, ensure_ascii=True)}"
    )

    try:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url  # ← tambah ini!
        )
        response = client.chat.completions.create(
            model=model_name,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": "Anda pakar continuous improvement, TPM, dan quality control.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        text = response.choices[0].message.content or _fallback_recommendation(payload)
        return {
            "source": "ollama",  # ← ubah dari openai
            "model": model_name,
            "text": text,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "source": "fallback",
            "model": None,
            "text": _fallback_recommendation(payload),
            "error": str(exc),
        }