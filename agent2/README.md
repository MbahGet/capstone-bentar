# Agent 2 - Production Decision Support

Agent 2 menganalisis CSV produksi harian untuk:
- KPI: OEE, downtime rate, defect rate
- Rule-based threshold alert
- Deteksi deviasi berbasis XGBoost
- Rekomendasi tindakan berbasis OpenAI API (dengan fallback rule jika API key belum diisi)

## 1) Setup

```bash
cd agent2
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Jalankan API

```bash
uvicorn app.main:app --reload --port 8002
```

## 3) Endpoint

- Health check: `GET /health`
- Analyze CSV: `POST /analyze`

Dokumentasi detail request/response ada di `docs/agent2_api_contract.md`.

Contoh test cepat:

```bash
curl -X POST "http://localhost:8002/analyze" ^
  -F "file=@data/production_daily_dummy.csv"
```

Threshold default:
- OEE rata-rata `< 80%` -> alert high
- Downtime rate rata-rata `> 15%` -> alert medium
- Defect rate rata-rata `> 3%` -> alert high

## 4) Environment Variable

Bisa pakai `.env`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Jika `OPENAI_API_KEY` kosong, sistem otomatis pakai fallback recommendation.
