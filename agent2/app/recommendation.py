from __future__ import annotations

from typing import Any, Dict, List

from settings import get_settings


def _fallback_recommendation(payload: Dict[str, Any]) -> str:
    alerts = payload.get("alerts", [])
    summary = payload.get("summary", {})
    top_devs = payload.get("top_deviations", [])

    actions: List[str] = []
    
    # Process alerts
    if alerts:
        actions.append("Prioritas Tindakan Berdasarkan Alerts:")
        for a in alerts:
            metric = a.get("metric", "")
            msg = a.get("message", "")
            lvl = a.get("level", "medium").upper()
            
            if metric == "oee":
                actions.append(f"  - [{lvl}] {msg}. Lakukan quick-loss analysis pada line terkait dan kaizen harian.")
            elif metric == "downtime_rate":
                actions.append(f"  - [{lvl}] {msg}. Jadwalkan preventive maintenance tambahan dan cek top 3 penyebab downtime.")
            elif metric == "defect_rate":
                actions.append(f"  - [{lvl}] {msg}. Perketat first-piece inspection dan validasi parameter proses.")
            else:
                actions.append(f"  - [{lvl}] {msg}.")

    # Process top deviations
    if top_devs:
        actions.append("\nPerhatian Khusus pada Mesin dengan Deviasi Tertinggi:")
        for d in top_devs[:3]: # Limit to top 3 for fallback
            machine = d.get('machine_id', 'Unknown')
            prob = d.get('deviation_probability', 0)
            actions.append(f"  - Mesin {machine} (Probabilitas Deviasi: {prob:.2%}): Cek parameter OEE ({d.get('oee')}%), Downtime ({d.get('downtime_rate')}%), Defect ({d.get('defect_rate')}%)")

    if not actions:
        actions.append(
            "KPI masih dalam batas aman. Lanjutkan monitoring harian dan audit mingguan untuk menjaga stabilitas proses."
        )

    return (
        "Rekomendasi otomatis (Fallback):\n"
        f"Ringkasan KPI: OEE {summary.get('avg_oee')}%, "
        f"Downtime {summary.get('avg_downtime_rate')}%, "
        f"Defect {summary.get('avg_defect_rate')}%\n\n"
        + "\n".join(actions)
    )


def generate_recommendation(payload: Dict[str, Any]) -> Dict[str, Any]:
    settings = get_settings()

    summary = payload.get("summary", {})
    alerts = payload.get("alerts", [])
    top_devs = payload.get("top_deviations", [])

    # Format alerts into text
    alerts_text = "Tidak ada alert kritis."
    if alerts:
        alerts_text = "\n".join([f"- [{a.get('level', '').upper()}] {a.get('metric')}: {a.get('message')}" for a in alerts])

    # Format top deviations into text
    top_devs_text = "Tidak ada deviasi signifikan."
    if top_devs:
        top_devs_text = "\n".join([
            f"- Mesin {d.get('machine_id')} pada tanggal {d.get('date')}: "
            f"Probabilitas Deviasi {d.get('deviation_probability', 0):.2%} "
            f"(OEE: {d.get('oee')}%, Downtime: {d.get('downtime_rate')}%, Defect: {d.get('defect_rate')}%)"
            for d in top_devs
        ])

    prompt = (
        "Data performa produksi saat ini:\n\n"
        "[1. RINGKASAN KPI]\n"
        f"- Rata-rata OEE: {summary.get('avg_oee', 'N/A')}%\n"
        f"- Rata-rata Downtime: {summary.get('avg_downtime_rate', 'N/A')}%\n"
        f"- Rata-rata Defect: {summary.get('avg_defect_rate', 'N/A')}%\n\n"
        "[2. DAFTAR ALERTS (Pelanggaran Threshold)]\n"
        f"{alerts_text}\n\n"
        "[3. MESIN DENGAN DEVIASI TERTINGGI]\n"
        f"{top_devs_text}\n\n"
        "Berdasarkan data di atas, berikan rekomendasi tindakan taktis yang actionable "
        "untuk Supervisor Produksi. Susun berdasarkan prioritas urgensi dari alert dan "
        "tingkat probabilitas deviasi tertinggi."
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
                        "content": (
                            "Kamu adalah AI Senior Industrial & Operations Engineer yang ahli "
                            "dalam menganalisis anomali manufaktur dan Root Cause Analysis. "
                            "Berikan instruksi operasional yang spesifik, berorientasi pada "
                            "tindakan (actionable), dan langsung bisa dieksekusi oleh tim di lapangan. "
                            "Gunakan bahasa Indonesia profesional dan struktur yang rapi (bullet points)."
                        )
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
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
