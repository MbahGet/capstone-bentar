# Agent 3 — Root Cause Analysis (RCA) Agent

> AI-powered Root Cause Analysis menggunakan SHAP (SHapley Additive exPlanations) + LLM (Large Language Model) reasoning

## 📋 Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Cara Menggunakan](#cara-menggunakan)
- [API Endpoints](#api-endpoints)
- [Struktur Folder](#struktur-folder)
- [Troubleshooting](#troubleshooting)

---

## Gambaran Umum

**Agent 3** adalah sistem AI yang dapat:

1. **Menganalisis data produksi** dari sensor mesin, log defect, dan downtime
2. **Melatih model XGBoost** untuk memahami pola defect
3. **Menghitung SHAP values** untuk menentukan fitur mana yang paling berpengaruh
4. **Menggunakan LLM (Ollama)** untuk generate narasi fishbone yang bisa dibaca manusia
5. **Memberikan rekomendasi tindakan konkret** untuk mencegah defect di masa depan

### Alur Kerja

```
Upload CSV Files
    ↓
Preprocessing (merge, clean, normalize)
    ↓
Correlation Analysis (Pearson, Spearman, chi-square)
    ↓
SHAP Analysis (XGBoost + TreeExplainer)
    ↓
LLM Explanation (Ollama generates fishbone narrative)
    ↓
JSON Output + Text Report
```

---

## Fitur

- ✅ **Automatic Data Preprocessing** — merge multiple CSV files, handle missing values, normalize
- ✅ **Statistical Analysis** — Pearson, Spearman correlation untuk identify significant features
- ✅ **Machine Learning** — XGBoost classifier untuk defect prediction
- ✅ **SHAP Explainability** — visualisasi feature importance dan impact
- ✅ **LLM-Powered Narration** — generate Fishbone/Ishikawa diagram narasi otomatis
- ✅ **FastAPI Server** — REST API untuk easy integration
- ✅ **Interactive Docs** — Swagger UI untuk testing endpoints

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.8+ |
| Web Framework | FastAPI |
| ML Model | XGBoost |
| Explainability | SHAP (SHapley Additive exPlanations) |
| LLM | Ollama (local inference) |
| Data Processing | Pandas, NumPy, SciPy |
| Visualization | Matplotlib, Seaborn |

---

## Persyaratan Sistem

### Hardware
- **RAM minimum:** 8GB (recommended 16GB)
- **Disk:** minimal 5GB untuk Ollama model
- **GPU:** optional (lebih cepat jika ada)

### Software
- Python 3.8 atau lebih baru
- Ollama (untuk LLM inference)
- Git (untuk version control)

---

## Instalasi

### Step 1: Clone Repository & Setup Folder

```bash
# Navigate ke folder project kamu
cd <YOUR_PROJECT_PATH>

# Buat folder agent3 jika belum ada
mkdir agent3
cd agent3
```

### Step 2: Setup Python Virtual Environment

```bash
# Buat virtual environment
python -m venv venv

# Aktifkan (Windows)
venv\Scripts\activate

# Atau jika pakai PowerShell
.\venv\Scripts\Activate.ps1

# Atau di Mac/Linux
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
# Install semua library yang dibutuhkan
pip install pandas numpy scipy scikit-learn xgboost shap fastapi uvicorn python-multipart fpdf2 matplotlib seaborn openai

# Atau pakai requirements.txt jika tersedia
pip install -r requirements.txt
```

### Step 4: Install Ollama

1. Download Ollama dari https://ollama.com/download
2. Install sesuai OS-mu (Windows/Mac/Linux)
3. Jalankan Ollama (akan berjalan di background)
4. Pull model:
   ```bash
   ollama pull llama3.1:8b
   ```

### Step 5: Siapkan Data

Buat folder `data/` dan masukkan 3 file CSV:

```
agent3/
├── data/
│   ├── production_log.csv    (sensor data dari mesin)
│   ├── defect_data.csv       (data cacat/defect)
│   └── downtime_log.csv      (log downtime mesin)
├── *.py (semua file Python)
└── venv/
```

**Format CSV yang diharapkan:**

**production_log.csv**
```
timestamp,temperature,vibration,pressure,humidity,rotation_speed,voltage,current,oil_level,load,...
2024-01-01 08:00,75.5,2.1,100.2,45,1500,230,10.5,75,50,...
```

**defect_data.csv**
```
Timestamp,Machine ID,Defect Rate (%),...
2025-05-01 08:00:00,M002,3.38,...
```

**downtime_log.csv**
```
timestamp,duration_minutes,reason
2024-01-01 12:00,45,Bearing_Maintenance
```

---

## Konfigurasi

### Ollama Configuration

Default: `http://localhost:11434/v1`

Jika Ollama running di server lain, edit `llm_explain.py`:

```python
explainer = LLMExplainer(
    shap_ranking_path=str(ranking_path),
    ollama_base_url="http://[IP_ADDRESS]:11434/v1",  # Change IP
    model="llama3.1:8b"
)
```

### FastAPI Configuration

Default port: `8000`

Untuk change port, edit `main.py`:
```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)  # Change port
```

---

## Cara Menggunakan

### Option 1: Test dengan Sample Data

```bash
# Pastikan Ollama sudah running
# Di terminal baru:

cd <YOUR_AGENT3_PATH>
python main.py
```

Akan start server di `http://localhost:8000`

Buka browser ke `http://localhost:8000/docs` dan klik:
1. **POST /test** → Try it out → Execute

Response akan show RCA hasil analysis dengan data sample yang ada.

### Option 2: Upload Custom CSV Files

Pakai endpoint **POST /analyze** di Swagger UI:

1. Buka `http://localhost:8000/docs`
2. Klik **POST /analyze**
3. Click **Try it out**
4. Upload 3 file CSV (production_log, defect_data, downtime_log)
5. Click **Execute**

Response akan include:
- Root causes ranking (top 5)
- Full explanation narasi
- Feature importance
- Link ke visualisasi PNG

### Option 3: Dari Python Script

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Test endpoint
response = client.post("/test")
print(response.json())
```

### Option 4: Curl Command

```bash
# Test dengan sample data
curl -X POST http://localhost:8000/test

# Dengan file upload
curl -X POST http://localhost:8000/analyze \
  -F "production_log=@<PATH_TO>/production_log.csv" \
  -F "defect_data=@<PATH_TO>/defect_data.csv" \
  -F "downtime_log=@<PATH_TO>/downtime_log.csv"
```

---

## API Endpoints

### GET /

Health check endpoint

**Response:**
```json
{
  "message": "RCA Agent is running",
  "service": "Root Cause Analysis Agent",
  "version": "1.0.0"
}
```

---

### POST /analyze

**Main RCA analysis endpoint** — upload 3 CSV files untuk full analysis

**Parameters:**
- `production_log` (file) — CSV dengan sensor data
- `defect_data` (file) — CSV dengan data defect
- `downtime_log` (file) — CSV dengan log downtime

**Response:**
```json
{
  "status": "success",
  "message": "RCA analysis completed successfully",
  "summary": {
    "total_records_analyzed": 1000,
    "defect_incidents_detected": 374,
    "defect_rate_percentage": 37.4
  },
  "root_causes": [
    {
      "rank": 1,
      "feature": "total_downtime_minutes",
      "importance_score": 5.053145
    },
    ...
  ],
  "explanation": "<<FULL NARASI FISHBONE>>",
  "artifacts": {
    "shap_summary_bar": "shap_summary_bar.png",
    "shap_summary_dot": "shap_summary_dot.png",
    "correlation_heatmap": "correlation_heatmap.png"
  }
}
```

---

### POST /test

**Quick test endpoint** — analyze menggunakan sample data yang sudah ada di `data/` folder

**Response:** (sama seperti /analyze)

---

### GET /health

Health check untuk monitoring

**Response:**
```json
{
  "status": "healthy",
  "service": "RCA Agent",
  "version": "1.0.0"
}
```

---

### GET /info

Service information

**Response:**
```json
{
  "name": "Root Cause Analysis Agent",
  "version": "1.0.0",
  "description": "AI-powered RCA using SHAP + LLM reasoning",
  "endpoints": {
    "POST /analyze": "Main RCA analysis endpoint",
    "POST /test": "Test with sample data",
    ...
  }
}
```

---

## Struktur Folder

```
agent3/
├── data/
│   ├── production_log.csv              # Input: sensor data
│   ├── defect_data.csv                 # Input: defect records
│   ├── downtime_log.csv                # Input: downtime log
│   ├── merged_dataset.csv              # Output: merged + preprocessed
│   ├── correlation_results.json        # Output: correlation analysis
│   ├── shap_ranking.json               # Output: SHAP feature ranking
│   ├── shap_feature_importance.csv     # Output: detailed importance
│   ├── rca_explanation.txt             # Output: narrative report
│   ├── rca_result.json                 # Output: structured results
│   ├── correlation_heatmap.png         # Output: correlation visualization
│   ├── shap_summary_bar.png            # Output: SHAP bar chart
│   ├── shap_summary_dot.png            # Output: SHAP dot plot
│   └── shap_force_plot.png             # Output: SHAP force plot
│
├── preprocessing.py                    # Module: data preprocessing
├── correlation.py                      # Module: correlation analysis
├── shap_analysis.py                    # Module: SHAP analysis
├── llm_explain.py                      # Module: LLM explanation generation
├── main.py                             # Entry point: FastAPI server
├── requirements.txt                    # Dependencies
├── README.md                           # This file
│
├── venv/                               # Virtual environment
└── .gitignore                          # Git ignore rules
```

---

## Output Interpretation

### Root Causes Ranking

**Contoh output:**
```
Rank 1: total_downtime_minutes (score: 5.05)
Rank 2: temperature (score: 1.04)
Rank 3: vibration (score: 0.85)
```

**Interpretasi:**
- Downtime adalah penyebab **paling berpengaruh** (5x lebih penting dari temperature)
- Jika downtime berkurang, kemungkinan defect akan signifikan turun

### Fishbone Narasi

Agent akan generate narasi yang menjelaskan:
- 3 penyebab utama
- Kategorisasi ke 6M (Man, Machine, Material, Method, Environment, Measurement)
- Rekomendasi tindakan konkret dengan timeline

---

## Troubleshooting

### Error: "ollama: No such file or directory"

**Solusi:** Ollama belum diinstall atau tidak di PATH
```bash
# Cek apakah Ollama running
curl http://localhost:11434/api/tags

# Jika error, download dari https://ollama.com/download
```

### Error: "Connection refused" saat call LLM

**Solusi:** Ollama server tidak running
```bash
# Buka Ollama Desktop atau jalankan di terminal:
ollama serve
```

### Error: "Model not found: llama3.1:8b"

**Solusi:** Pull model dulu
```bash
ollama pull llama3.1:8b
```

### Server running tapi endpoints timeout

**Solusi:** Analysis sedang berjalan (terutama SHAP calculation). Tunggu lebih lama (bisa 2-5 menit untuk dataset besar).

### CSV tidak ter-read dengan baik

**Solusi:** Check format:
- Delimiter harus `,` (comma)
- Encoding harus UTF-8
- Ada header row
- Tidak ada empty rows di tengah data

---

## Performance Tips

1. **Gunakan dataset 500-2000 rows untuk hasil optimal**
   - Terlalu kecil (<100): hasil tidak reliable
   - Terlalu besar (>10000): analysis jadi lama

2. **RAM penting untuk SHAP calculation**
   - Minimum 8GB
   - 16GB recommended

3. **GPU dapat mempercepat XGBoost training**
   - Ubah parameter di `shap_analysis.py` untuk enable GPU

---

## Resource & References

- [SHAP Documentation](https://shap.readthedocs.io/)
- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [Ollama Models](https://ollama.com/library)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Fishbone Diagram](https://en.wikipedia.org/wiki/Ishikawa_diagram)

---

## License

Part of Capstone Project — PT DearGod, 2024

---

## FAQ

**Q: Apakah perlu GPU?**
A: Tidak wajib, tapi GPU akan mempercepat SHAP calculation ~3-5x

**Q: Bisa pakai LLM lain selain Ollama?**
A: Ya, tinggal edit `llm_explain.py` untuk pakai OpenAI/Groq/Gemini

**Q: Berapa lama analysis untuk 1000 rows?**
A: ~2-5 menit tergantung hardware dan jumlah features

**Q: Bisa deploy ke production?**
A: Ya, containerize dengan Docker + deploy ke cloud (AWS, Azure, GCP)

---

## Support

Untuk issues, questions, atau suggestions:
1. Check Troubleshooting section dulu
2. Review logs di console saat running
3. Hubungi tim development

---

**Happy analyzing! 🚀**

*Last updated: May 12, 2024*