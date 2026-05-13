# Agent 2 API Contract (Untuk Anggota 4 & 5)

## Base URL (lokal)

`http://localhost:8002`

## Endpoint

### `POST /analyze`

Analyze file CSV produksi harian.

### Content-Type

`multipart/form-data`

### Form Field

- `file` (required): file CSV

### Required CSV Columns

1. `date` (YYYY-MM-DD)
2. `machine_id` (string)
3. `planned_production_time_min` (numeric)
4. `operating_time_min` (numeric)
5. `total_units` (numeric)
6. `defect_units` (numeric)
7. `ideal_cycle_time_min` (numeric)

### Data Validation

- Semua kolom numeric wajib berisi angka valid.
- `planned_production_time_min` harus `> 0`.
- `operating_time_min` harus `>= 0` dan tidak boleh melebihi `planned_production_time_min`.
- `total_units` harus `> 0`.
- `defect_units` harus `>= 0` dan tidak boleh melebihi `total_units`.
- `ideal_cycle_time_min` harus `> 0`.

### KPI Formula

- `downtime_min = planned_production_time_min - operating_time_min`
- `availability = operating_time_min / planned_production_time_min`
- `performance = (ideal_cycle_time_min * total_units) / operating_time_min`
- `quality = (total_units - defect_units) / total_units`
- `oee = availability * performance * quality * 100`
- `downtime_rate = downtime_min / planned_production_time_min * 100`
- `defect_rate = defect_units / total_units * 100`

### Alert Threshold

- `avg_oee < 80.0` -> `high`
- `avg_downtime_rate > 15.0` -> `medium`
- `avg_defect_rate > 3.0` -> `high`

## Success Response (200)

```json
{
  "summary": {
    "avg_oee": 73.74,
    "avg_downtime_rate": 21.98,
    "avg_defect_rate": 4.12,
    "total_downtime_min": 2370.0,
    "total_production_units": 191240,
    "total_defect_units": 7912
  },
  "alerts": [
    {
      "metric": "oee",
      "level": "high",
      "message": "OEE 73.74% < 80.0%"
    }
  ],
  "model_metrics": {
    "deviation_count": 9,
    "deviation_ratio": 0.3,
    "max_deviation_probability": 0.9932
  },
  "top_deviations": [
    {
      "date": "2026-03-01",
      "machine_id": "M-02",
      "oee": 61.21,
      "downtime_rate": 15.83,
      "defect_rate": 4.0,
      "deviation_probability": 0.9932,
      "deviation_flag": 1
    }
  ],
  "recommendation": {
    "source": "openai",
    "model": "gpt-4.1-mini",
    "text": "Rekomendasi tindakan prioritas..."
  }
}
```

## Error Response

### 400

- File bukan CSV
- CSV tidak bisa di-parse
- CSV kosong

### 422

- Kolom wajib CSV tidak lengkap
- Nilai numeric tidak valid atau rule validasi data dilanggar

### 503

- Training data dummy tidak tersedia sehingga model deviasi tidak bisa dilatih

## Catatan Integrasi Frontend (Anggota 4)

- Kirim request sebagai multipart form-data dengan key `file`
- Tampilkan `summary` sebagai KPI cards
- Gunakan `alerts` untuk badge/status indikator
- Tampilkan `top_deviations` dalam table dan highlight `deviation_flag = 1`
- Render `recommendation.text` dalam panel rekomendasi

## Catatan Integrasi Deployment (Anggota 5)

- Port default lokal: `8002`
- Endpoint health check: `GET /health`
- Service butuh dependency `xgboost`
- OpenAI opsional: tanpa key tetap jalan via fallback
- Model XGBoost dilatih otomatis dari `data/production_daily_dummy.csv` saat startup atau request pertama
