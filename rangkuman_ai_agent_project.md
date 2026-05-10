# Rangkuman Diskusi: Proyek 3 AI Agent Industrial

> Dokumen ini merangkum keputusan teknis dan arsitektur yang sudah disepakati tim.

---

## Latar belakang

Tugas ini adalah membangun **3 AI Agent** berbasis industrial yang diakses lewat satu web application. Awalnya kita pertimbangkan apakah semua bisa dikerjakan pakai **n8n**, tapi setelah didiskusikan ternyata n8n kurang optimal untuk kebutuhan ML yang berat seperti SHAP analysis dan XGBoost. Jadi kita putuskan pakai **pendekatan hybrid**.

---

## Keputusan stack

| Agent | Stack | Alasan |
|---|---|---|
| Agent 1 | n8n (native) | RAG pipeline sudah tersedia native |
| Agent 2 | Python + FastAPI | Butuh XGBoost dan kalkulasi KPI kompleks |
| Agent 3 | Python + FastAPI | Butuh SHAP dan statistical testing |

Agent 2 & 3 di-deploy ke server yang sama via **Docker Compose**. Agent 1 (n8n) memanggil Agent 2 & 3 lewat HTTP Request node saat dibutuhkan.

---

## 3 Agent yang dipilih

### Agent 1 — Document Intelligence (n8n)

Agent ini punya **dua peran sekaligus**: sebagai chatbot berbasis dokumen, dan sebagai orchestrator yang memanggil Agent 2 & 3 ketika pertanyaan user membutuhkan analisis lebih dalam.

- Membaca SOP, manual mesin, laporan QC via RAG pipeline
- Menjawab pertanyaan berbasis dokumen internal
- Memanggil Agent 2 otomatis jika user tanya soal KPI atau rekomendasi produksi
- Memanggil Agent 3 otomatis jika user tanya soal root cause masalah

**Alur node di n8n:**
```
Chat Trigger → Document Loader → Embeddings → Vector Store → AI Agent → Response
                                                                ↓
                                              (kalau perlu) HTTP Request ke Agent 2 / Agent 3
```

**Stack:** n8n + Pinecone/Qdrant + OpenAI Embeddings + OpenAI API

---

### Agent 2 — Production Decision Support (Python)

Menerima data produksi harian dalam format CSV, menganalisis KPI seperti OEE dan downtime, mendeteksi deviasi pakai XGBoost, lalu menghasilkan rekomendasi tindakan via LLM.

**Stack:** Python + FastAPI + XGBoost + OpenAI API

---

### Agent 3 — Root Cause Analysis (Python)

Agent yang paling kompleks sekaligus paling impressive. Tugasnya mencari akar penyebab masalah produksi dari tiga sumber data, lalu menghasilkan laporan fishbone yang bisa dibaca manusia.

**Stack:** Python + FastAPI + statsmodels + SHAP + OpenAI API

---

## Kenapa RCA, bukan Forecasting?

Sempat ada pertimbangan untuk mengganti Agent 3 dengan **Demand Forecasting Agent**. Tapi akhirnya kita pilih RCA karena ketiga agent membentuk narasi yang jauh lebih kohesif:

- Agent 1 → *"SOP bilang apa kalau terjadi masalah ini?"*
- Agent 2 → *"OEE turun, ini rekomendasinya."*
- Agent 3 → *"Akar penyebabnya adalah mesin X karena..."*

Forecasting akan memutus narasi itu karena arahnya ke supply chain, bukan analisis produksi.

---

## Arsitektur web (Sprint 1)

### Alur user

```
Landing page (upload semua file)
     ↓
Upload dokumen SOP/manual/QC          → untuk Agent 1
Upload CSV data produksi              → untuk Agent 2
Upload log produksi + defect + downtime → untuk Agent 3
     ↓
Semua file diproses di background
     ↓
Masuk ke dashboard chat Agent 1
(Agent 1 otomatis panggil Agent 2/3 kalau dibutuhkan)
```

### Halaman web

| Halaman | Isi |
|---|---|
| Landing page | Penjelasan singkat + form upload semua file |
| Dashboard chat | Chat interface Agent 1 sebagai orchestrator utama |
| Halaman Agent 2 | Akses langsung ke Decision Support (bypass chat) |
| Halaman Agent 3 | Akses langsung ke RCA (bypass chat) |

> Sprint 1 pakai alur upload di awal. Sprint berikutnya akan diubah ke upload langsung di dalam chat.

---

## Data flow Agent 3 — Root Cause Analysis

```
production_log.csv  ─┐
defect_data.csv     ─┼──→ [1] Preprocessing ──→ merged_dataset.csv
downtime_log.csv    ─┘         merge, handle missing, normalize

                               ↓

                        [2] Correlation analysis ──→ correlation_matrix.json
                            Pearson, Spearman, chi-square test
                            Filter fitur dengan threshold r > 0.3

                               ↓

                        [3] SHAP ranking ──→ shap_ranking.json
                            Train XGBoost → TreeExplainer
                            Ranking top-5 root cause by mean |SHAP|

                               ↓

                        [4] LLM explanation ──→ rca_report.pdf
                            Prompt builder → GPT-4o → render PDF
                            + rca_result.json (untuk integrasi API)
```

---

## Yang belum dibahas

- Kode starter Agent 2 dan Agent 3
- Setup Docker Compose untuk deploy
- Format lengkap laporan fishbone output
- Logika orchestration Agent 1 (kapan panggil Agent 2, kapan panggil Agent 3)

---

*Last updated: Mei 2026*
