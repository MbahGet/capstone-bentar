from __future__ import annotations

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
        "Rekomendasi otomatis:\n"
        f"- Ringkasan KPI: OEE {summary.get('avg_oee')}%, "
        f"Downtime {summary.get('avg_downtime_rate')}%, "
        f"Defect {summary.get('avg_defect_rate')}%\n"
        + "\n".join(f"- {item}" for item in actions)
    )


def generate_recommendation(payload: Dict[str, Any]) -> Dict[str, Any]:
    settings = get_settings()

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

    # --- Groq (primary) ---
    if settings.groq_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=settings.groq_api_key,
                base_url=settings.groq_base_url,
            )
            response = client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Kamu adalah AI industrial operations advisor yang ahli dalam manufaktur.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=512,
            )
            text = response.choices[0].message.content
            print(f"[Recommendation] Groq call OK ({settings.groq_model})")
            return {"source": "groq", "model": settings.groq_model, "text": text}
        except Exception as exc:
            print(f"[Recommendation] Groq failed: {exc} — falling back to rule-based")

    # --- Fallback: rule-based ---
    return {
        "source": "fallback",
        "model": None,
        "text": _fallback_recommendation(payload),
    }
