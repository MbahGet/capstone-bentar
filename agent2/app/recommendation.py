from __future__ import annotations

import json
import requests
from typing import Any, Dict, List

from settings import get_settings


def _fallback_recommendation(payload: Dict[str, Any]) -> str:
    alerts = payload.get("alerts", [])
    summary = payload.get("summary", {})

    actions: List[str] = []
    if any(a.get("metric") == "oee" for a in alerts):
        actions.append(
            "Prioritaskan quick-loss analysis pada line dengan OEE terendah dan lakukan kaizen harian."
        )
    if any(a.get("metric") == "downtime_rate" for a in alerts):
        actions.append(
            "Jadwalkan preventive maintenance tambahan dan cek top 3 penyebab downtime tiap shift."
        )
    if any(a.get("metric") == "defect_rate" for a in alerts):
        actions.append(
            "Perketat first-piece inspection serta validasi parameter proses pada mesin dengan defect tertinggi."
        )

    if not actions:
        actions.append(
            "KPI masih dalam batas aman. Lanjutkan monitoring harian dan audit mingguan untuk menjaga stabilitas proses."
        )

    return (
        "Rekomendasi otomatis (fallback):\n"
        f"- Ringkasan KPI: OEE {summary.get('avg_oee')}%, "
        f"Downtime {summary.get('avg_downtime_rate')}%, "
        f"Defect {summary.get('avg_defect_rate')}%\n"
        + "\n".join(f"- {item}" for item in actions)
    )


def generate_recommendation(payload: Dict[str, Any]) -> Dict[str, Any]:
    settings = get_settings()
    api_key = settings.ollama_api_key
    base_url = settings.ollama_base_url
    model_name = settings.ollama_model

    if not api_key or not base_url:
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
        f"Ringkasan KPI: OEE {payload.get('summary', {}).get('avg_oee', 'N/A')}%, "
        f"Downtime {payload.get('summary', {}).get('avg_downtime_rate', 'N/A')}%, "
        f"Defect {payload.get('summary', {}).get('avg_defect_rate', 'N/A')}%\n"
        f"Alert: {len(payload.get('alerts', []))} item(s)\n"
        f"Top deviation: {len(payload.get('top_deviations', []))} item(s)"
    )

    try:
        # Call Ollama via HTTP requests using /api/generate endpoint
        url = f"{base_url}/api/generate"

        payload_request = {"model": model_name, "prompt": prompt, "stream": False}

        print(f"[Recommendation] Calling Ollama at {url}")
        print(f"[Recommendation] Prompt length: {len(prompt)} chars")
        response = requests.post(url, json=payload_request, timeout=180)

        if response.status_code != 200:
            print(
                f"[Recommendation] Ollama returned {response.status_code}: {response.text[:200]}"
            )
            return {
                "source": "fallback",
                "model": None,
                "text": _fallback_recommendation(payload),
                "error": f"Ollama returned {response.status_code}",
            }

        result = response.json()
        text = result.get("response", _fallback_recommendation(payload))

        return {
            "source": "ollama",
            "model": model_name,
            "text": text,
        }
    except requests.exceptions.ConnectionError:
        print(f"Warning: Cannot connect to Ollama at {base_url}")
        return {
            "source": "fallback",
            "model": None,
            "text": _fallback_recommendation(payload),
            "error": f"Ollama connection failed at {base_url}",
        }
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: Error calling Ollama: {exc}")
        return {
            "source": "fallback",
            "model": None,
            "text": _fallback_recommendation(payload),
            "error": str(exc),
        }
