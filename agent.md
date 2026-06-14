# 🏭 Panduan Penggunaan Agent — FactoryOps Copilot

Sistem ini terdiri dari **3 Agent AI** yang bekerja secara terintegrasi. Pengguna hanya perlu berinteraksi melalui **chatbot Agent 1**. Agent 2 dan Agent 3 dipanggil secara otomatis di balik layar sesuai kebutuhan.

---

## Agent 1 — Orchestrator (Chatbot Utama)

**Teknologi:** n8n + Groq LLM + Qdrant RAG  
**Akses:** Chatbot di UI aplikasi  
**Port:** `5678` (internal)

Agent 1 adalah **pintu masuk tunggal** bagi pengguna. Ia membaca maksud pertanyaan, lalu memilih tool yang tepat: mencari SOP di Qdrant, memanggil Agent 2 untuk data KPI, atau Agent 2 untuk laporan Fishbone RCA.

### Apa yang bisa ditanyakan ke Agent 1?

Agent 1 mengenali **4 jenis pertanyaan** dan akan merespons secara berbeda untuk setiap jenis.

---

#### 🔵 Kondisi A — Membaca Isi SOP / Prosedur Dokumen

Gunakan saat ingin mengetahui isi dokumen SOP yang sudah diupload ke sistem.

| Contoh Pertanyaan | Respons |
|---|---|
| "Coba baca Tujuan dari SOP" | Menampilkan teks tujuan SOP verbatim |
| "Tampilkan SOP eskalasi" | Menampilkan prosedur eskalasi dari dokumen |
| "Apa isi poin 7 dari SOP?" | Menampilkan isi poin 7 secara lengkap |
| "Berapa ambang batas OEE menurut SOP?" | Mengambil nilai threshold dari dokumen |
| "Siapa yang bertanggung jawab saat downtime?" | Menampilkan nama jabatan dari SOP |

> **Cara kerja:** Agent 1 mencari dokumen di Qdrant (vector store) dan menyajikan isi teks aslinya tanpa mengarang.

---

#### 🟡 Kondisi B — Data KPI & Rekomendasi Taktis (via Agent 2)

Gunakan saat ingin mengetahui kondisi produksi terkini, angka KPI, atau rekomendasi tindakan lapangan.

| Contoh Pertanyaan | Respons |
|---|---|
| "Hasil agent 2" / "Tunjukkan hasil agent 2" | Laporan taktis lengkap per tanggal dan mesin |
| "Berapa OEE saat ini?" | Nilai OEE terbaru beserta status deviasi |
| "Kondisi mesin sekarang bagaimana?" | Status mesin, downtime, dan defect rate |
| "Ada mesin yang deviasi?" | Daftar mesin dengan probabilitas deviasi tertinggi |
| "Berikan rekomendasi tindakan untuk supervisor" | Laporan rekomendasi aksi taktis prioritas tinggi |
| "KPI produksi hari ini" | Ringkasan OEE, Availability, Performance, Quality |
| "Mesin mana yang paling bermasalah?" | Top-5 mesin dengan deviasi tertinggi |

> **Cara kerja:** Agent 1 memanggil Agent 2 (`/report`), mengambil field `recommendation_report_text` dari respons, dan menyajikannya kata per kata kepada pengguna.

---

#### 🔴 Kondisi C — Analisis Root Cause / Fishbone RCA (via Agent 3)

Gunakan saat ingin mengetahui penyebab mendalam dari defect produksi.

| Contoh Pertanyaan | Respons |
|---|---|
| "Hasil agent 3" / "Tunjukkan hasil agent 3" | Laporan Fishbone RCA lengkap |
| "Kenapa defect tinggi?" | Analisis akar masalah berdasarkan SHAP + LLM |
| "Apa penyebab utama defect?" | Top-3 faktor penyebab dari SHAP ranking |
| "Tampilkan analisis fishbone" | Diagram Fishbone (Man/Machine/Material/Method/Environment/Measurement) |
| "Faktor apa yang paling mempengaruhi defect?" | Ranking fitur berdasarkan importance score |
| "Rangkuman RCA" / "Rangkuman agent 3" | Narasi RCA lengkap dari Groq LLM |
| "Apa rekomendasi RCA-nya?" | Daftar 3–5 rekomendasi tindakan prioritas |

> **Cara kerja:** Agent 1 memanggil Agent 3 (`/report`), mengambil field `rca_report_text` dari respons (narasi Fishbone dari Groq), dan menyajikannya verbatim.

---

#### 🟣 Kondisi D — Validasi SOP: Data Lapangan vs Aturan Pabrik

Gunakan saat ingin memvalidasi apakah kondisi/angka tertentu sudah sesuai SOP, dan siapa yang harus melakukan eskalasi.

| Contoh Pertanyaan | Respons |
|---|---|
| "OEE 85% apakah sudah aman sesuai SOP?" | Validasi threshold + instruksi tindakan + status eskalasi |
| "Downtime 25%, apa yang harus dilakukan?" | Panduan tindakan dari SOP + siapa yang harus dihubungi |
| "Defect 6% ini perlu eskalasi ke siapa?" | Nama jabatan dari SOP + prosedur eskalasi |

> **Cara kerja:** Agent 1 memanggil Qdrant untuk mendapatkan aturan SOP, lalu menyajikan jawaban dalam format 4 poin: **STATUS SAAT INI → PELANGGARAN AMBANG BATAS → INSTRUKSI TINDAKAN (SOP) → ESKALASI**.

---

### Upload Dokumen SOP ke Agent 1

Sebelum Agent 1 bisa menjawab pertanyaan tentang SOP, dokumen harus diupload terlebih dahulu melalui UI.

**Format yang didukung:** `.pdf`, `.csv`, `.txt`, `.md`, `.log`

Setelah upload, dokumen akan:
1. Diekstrak teksnya
2. Di-embed menggunakan Ollama (`nomic-embed-text`)
3. Disimpan di Qdrant vector store
4. Siap dicari saat ada pertanyaan SOP

---

---

## Agent 2 — Production Decision Support (KPI Analyst)

**Teknologi:** FastAPI + XGBoost + Groq LLM  
**Port:** `8000`  
**Endpoint utama:** `POST /query`, `POST /analyze`

Agent 2 bertugas menganalisis **data produksi harian** dan menghasilkan laporan taktis yang siap dieksekusi oleh supervisor lapangan.

### Pipeline Kerja Agent 2

```
Data CSV Produksi
  → calculate_kpis()          ← Hitung OEE, Availability, Performance, Quality, Downtime Rate, Defect Rate
  → evaluate_thresholds()     ← Deteksi pelanggaran ambang batas SOP
  → DeviationModel.predict()  ← XGBoost: prediksi probabilitas deviasi per mesin per tanggal
  → top_deviation_rows()      ← Ranking top-5 mesin paling berisiko
  → generate_recommendation() ← Groq LLM: buat laporan taktis actionable
  → recommendation_report_text ← Field yang diteruskan ke chatbot
```

### Output yang Dihasilkan

| Field | Isi |
|---|---|
| `summary` | Rata-rata global OEE, downtime, defect |
| `alerts` | Daftar pelanggaran threshold (CRITICAL/HIGH/MEDIUM) |
| `model_metrics` | Performa model XGBoost (accuracy, F1) |
| `top_deviations` | Top-5 mesin: tanggal, OEE, downtime, defect, probabilitas deviasi |
| `recommendation` | Objek rekomendasi (`source`, `model`, `text`) |
| **`recommendation_report_text`** | **String teks laporan taktis lengkap — dipakai oleh chatbot** |

### Cara Akses Langsung (tanpa chatbot)

```bash
# Cek kesehatan
GET http://localhost:8000/health

# Query dengan data default (dari data/production_daily_dummy.csv)
POST http://localhost:8000/query
Content-Type: application/json
{"query": "analisis kondisi produksi", "sessionId": "optional-id"}

# Upload CSV untuk analisis
POST http://localhost:8000/analyze
Content-Type: multipart/form-data
file: <file.csv>

# Lihat dokumentasi API
GET http://localhost:8000/docs
```

### Format Data CSV yang Diterima Agent 2

Kolom minimal yang dibutuhkan:

| Kolom | Keterangan |
|---|---|
| `timestamp` / `date` | Tanggal produksi |
| `machine_id` | ID mesin |
| `total_output` | Total unit diproduksi |
| `good_output` | Unit lolos QC |
| `downtime_minutes` | Menit downtime |
| `planned_production_time` | Menit rencana produksi |

---

---

## Agent 3 — Root Cause Analysis (RCA Analyst)

**Teknologi:** FastAPI + XGBoost + SHAP + Groq LLM  
**Port:** `9000`  
**Endpoint utama:** `POST /query`, `POST /analyze`

Agent 3 bertugas melakukan **analisis mendalam penyebab defect** menggunakan kombinasi machine learning (SHAP) dan Large Language Model (Groq) untuk menghasilkan Laporan Fishbone (Ishikawa).

### Pipeline Kerja Agent 3

```
Data CSV (Production + Defect + Downtime)
  → DataPreprocessor.preprocess()     ← Merge, bersihkan, feature engineering
  → CorrelationAnalyzer               ← Pearson, Spearman, Chi-Square correlation
  → SHAPAnalyzer                      ← Train XGBoost → hitung SHAP values → ranking fitur
  → LLMExplainer.generate_explanation() ← Groq LLM: buat narasi Fishbone dari SHAP ranking
  → rca_report_text                   ← Field yang diteruskan ke chatbot
```

### Output yang Dihasilkan

| Field | Isi |
|---|---|
| `summary` | Total record, jumlah defect incident, defect rate % |
| `root_causes` | Top-5 faktor penyebab dengan importance score |
| `explanation` | Narasi RCA dari Groq LLM |
| **`rca_report_text`** | **String teks Laporan Fishbone lengkap — dipakai oleh chatbot** |
| `feature_importance` | CSV lines dari SHAP feature importance |
| `artifacts` | Nama file chart SHAP (bar, dot, heatmap) |

### Struktur Laporan Fishbone yang Dihasilkan

```
1. IDENTIFIKASI PENYEBAB UTAMA
   - 3 penyebab utama berdasarkan SHAP ranking
   - Penjelasan mengapa faktor-faktor ini berpengaruh

2. ANALISIS FISHBONE (Ishikawa Diagram)
   - Man       : error operator, level training
   - Machine   : kondisi mesin, wear & tear, maintenance
   - Material  : kualitas bahan baku, spesifikasi
   - Method    : prosedur, SOP, parameter proses
   - Environment: suhu, kelembaban lingkungan kerja
   - Measurement: akurasi sensor, kalibrasi alat

3. REKOMENDASI TINDAKAN
   - 3–5 tindakan konkret, urut prioritas tinggi → rendah
   - Estimasi timeline implementasi masing-masing
```

### Cara Akses Langsung (tanpa chatbot)

```bash
# Cek kesehatan
GET http://localhost:9000/health

# Query RCA dengan data lokal (data/ folder di container)
POST http://localhost:9000/query
Content-Type: application/json
{"query": "analisis penyebab defect", "sessionId": "optional-id"}

# Upload CSV terintegrasi untuk analisis penuh
POST http://localhost:9000/analyze
Content-Type: multipart/form-data
file: <integrated_production_log.csv>

# Test dengan sample data bawaan
POST http://localhost:9000/test

# Lihat dokumentasi API
GET http://localhost:9000/docs
```

### Format Data CSV yang Diterima Agent 3

Agent 3 menerima **satu CSV terintegrasi** (format `integrated_production_log.csv`). Data Gateway akan otomatis memecahnya menjadi 3 tabel:

| Sub-dataset | Kolom Kunci |
|---|---|
| Production Log | `timestamp`, `machine_id`, `total_output`, `good_output`, `planned_production_time` |
| Defect Data | `timestamp`, `machine_id`, `defect_type`, `defect_count` |
| Downtime Log | `timestamp`, `machine_id`, `downtime_minutes`, `downtime_reason` |

---

---

## Ringkasan Alur Penggunaan Sistem

```
┌──────────────────────────────────────┐
│        Pengguna (via Chatbot UI)     │
└─────────────────┬────────────────────┘
                  │ Pertanyaan natural language
                  ▼
┌──────────────────────────────────────┐
│         AGENT 1 — Orchestrator       │
│  (n8n + Groq + Qdrant RAG)          │
│                                      │
│  Kondisi A → Cari di Qdrant (SOP)   │
│  Kondisi B → Panggil Agent 2        │
│  Kondisi C → Panggil Agent 3        │
│  Kondisi D → Qdrant + Format 4 poin │
└──────┬───────────────────┬───────────┘
       │                   │
       ▼                   ▼
┌──────────────┐   ┌──────────────────┐
│   AGENT 2    │   │    AGENT 3       │
│ KPI Analyst  │   │  RCA Analyst     │
│              │   │                  │
│ XGBoost +    │   │ SHAP + XGBoost + │
│ Groq LLM     │   │ Groq LLM         │
│              │   │                  │
│ → KPI report │   │ → Fishbone report│
│ → Deviasi    │   │ → Root causes    │
│ → Rekomendasi│   │ → Rekomendasi    │
└──────────────┘   └──────────────────┘
```

---

## Pertanyaan yang TIDAK bisa dijawab Agent 1

Agent 1 dirancang dengan prinsip **Zero Internal Knowledge** — ia tidak akan mengarang jawaban. Berikut pertanyaan yang akan ditolak atau membutuhkan dokumen:

| Pertanyaan | Alasan tidak bisa dijawab |
|---|---|
| "Siapa yang harus dihubungi saat darurat?" | Butuh SOP diupload dulu ke sistem |
| "Berapa target OEE perusahaan ini?" | Butuh SOP/dokumen kebijakan diupload |
| "Kapan jadwal maintenance berikutnya?" | Data tidak tersedia di backend |
| Pertanyaan di luar konteks pabrik/produksi | Di luar scope sistem |

> **Solusi:** Upload dokumen SOP, kebijakan, atau panduan operasional ke sistem terlebih dahulu melalui fitur upload di UI.
