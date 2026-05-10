# Backlog — Proyek 3 AI Agent Industrial

> Pembagian jobdesk tim 6 orang. Sesuaikan nama anggota sebelum didistribusikan.

---

## Ringkasan Pembagian

| Anggota | Role | Tanggung Jawab |
|---|---|---|
| Anggota 1 | AI & RAG Engineer | Agent 1 — n8n + RAG pipeline |
| Anggota 2 | Agent 2 Engineer | Agent 2 — ML core + FastAPI |
| Anggota 3 | Agent 3 Engineer | Agent 3 — ML core + FastAPI |
| Anggota 4 | Frontend Engineer | Semua UI (landing, chat, Agent 2, Agent 3) |
| Anggota 5 | Backend + DevOps | Integrasi, Docker, deploy |
| Anggota 6 | Project Lead | Koordinasi + dokumentasi |

---

## Anggota 1 — AI & RAG Engineer (Agent 1)

Bertanggung jawab penuh atas Agent 1: n8n workflow, RAG pipeline, dan logika orchestration ke Agent 2 & 3.

- [ ] Daftar dan setup workspace n8n
- [ ] Konfigurasi koneksi OpenAI API di n8n
- [ ] Buat workflow RAG: Chat Trigger → Document Loader → Embeddings → Vector Store → AI Agent → Response
- [ ] Setup Vector Store (Pinecone atau Qdrant)
- [ ] Upload dan test dokumen dummy (SOP, manual mesin, laporan QC)
- [ ] Tambah Window Buffer Memory agar agent ingat konteks percakapan
- [ ] Test multi-document reasoning
- [ ] Buat system prompt konteks industrial
- [ ] Implementasi logika orchestration: kapan panggil Agent 2, kapan panggil Agent 3
- [ ] Buat HTTP Request node ke endpoint Agent 2 (`POST /analyze`)
- [ ] Buat HTTP Request node ke endpoint Agent 3 (`POST /rca`)
- [ ] Dokumentasi workflow n8n (screenshot + penjelasan tiap node)

---

## Anggota 2 — Agent 2 Engineer (Production Decision Support)

Bertanggung jawab atas ML core dan API Agent 2. Tidak mengerjakan UI.

- [ ] Siapkan dummy dataset CSV data produksi harian
- [ ] Bangun KPI engine: kalkulasi OEE, downtime, defect rate
- [ ] Implementasi rule-based threshold check (misal: OEE < 80% = alert)
- [ ] Train model XGBoost untuk deteksi deviasi
- [ ] Integrasi OpenAI API untuk generate rekomendasi tindakan (LLM reasoning)
- [ ] Buat FastAPI endpoint: `POST /analyze` — terima CSV, return insight + rekomendasi
- [ ] Dokumentasi format input/output endpoint untuk Anggota 4 & 5
- [ ] Test endpoint dengan Postman sebelum diserahkan ke Anggota 4

---

## Anggota 3 — Agent 3 Engineer (Root Cause Analysis)

Bertanggung jawab atas ML core dan API Agent 3. Tidak mengerjakan UI.

- [x] Siapkan dummy dataset: log produksi, data defect, data downtime
- [ ] Implementasi preprocessing: merge by timestamp, handle missing values, normalisasi
- [ ] Implementasi correlation analysis: Pearson, Spearman, chi-square test
- [ ] Train XGBoost → hitung SHAP value dengan TreeExplainer
- [ ] Buat ranking top-5 root cause berdasarkan mean |SHAP|
- [ ] Bangun prompt builder: inject SHAP ranking + konteks ke LLM
- [ ] Integrasi OpenAI API untuk generate narasi fishbone
- [ ] Generate output: `rca_report.pdf` + `rca_result.json`
- [ ] Buat FastAPI endpoint: `POST /rca` — terima tiga CSV, return laporan
- [ ] Dokumentasi format input/output endpoint untuk Anggota 4 & 5
- [ ] Test endpoint dengan Postman sebelum diserahkan ke Anggota 4

---

## Anggota 4 — Frontend Engineer (Semua UI)

Bertanggung jawab atas seluruh tampilan web. Mulai sambungkan ke backend setelah endpoint Anggota 2 & 3 siap (target: akhir hari 3).

**Setup & Landing page**
- [ ] Setup project frontend (React / Next.js)
- [ ] Buat layout utama dan navigasi antar halaman
- [ ] Buat landing page: penjelasan singkat + form upload semua file
- [ ] Form upload: dokumen SOP/manual/QC, CSV produksi, log produksi + defect + downtime
- [ ] Setelah upload selesai, redirect otomatis ke dashboard chat

**Dashboard chat (Agent 1)**
- [ ] Buat halaman chat interface sebagai halaman utama setelah upload
- [ ] Implementasi koneksi ke n8n webhook
- [ ] Tampilkan riwayat percakapan (chat history)
- [ ] Handle respons dari Agent 1 yang mungkin berisi hasil dari Agent 2/3

**Halaman Agent 2 (akses langsung)**
- [ ] Buat halaman upload CSV data produksi
- [ ] Tampilkan KPI hasil analisis (OEE, downtime, defect rate)
- [ ] Tampilkan chart tren KPI
- [ ] Tampilkan rekomendasi tindakan dari LLM

**Halaman Agent 3 (akses langsung)**
- [ ] Buat halaman upload tiga file (log produksi, defect, downtime)
- [ ] Tampilkan SHAP chart (bar chart ranking root cause)
- [ ] Tampilkan narasi fishbone dari LLM
- [ ] Tombol download laporan PDF

**Umum**
- [ ] Pastikan semua halaman responsif
- [ ] Koordinasi dengan Anggota 1 untuk webhook URL n8n
- [ ] Koordinasi dengan Anggota 2 & 3 untuk format response API
- [ ] Koordinasi dengan Anggota 5 untuk CORS dan deployment

---

## Anggota 5 — Backend + DevOps (Integrasi)

Memastikan semua service bisa berjalan bersama dan diakses dari luar.

- [ ] Setup struktur repository (monorepo atau multi-repo)
- [ ] Buat `docker-compose.yml` untuk Agent 2 & 3
- [ ] Setup environment variables dan secrets management (`.env`)
- [ ] Pastikan Agent 2 endpoint bisa dipanggil dari frontend dan n8n
- [ ] Pastikan Agent 3 endpoint bisa dipanggil dari frontend dan n8n
- [ ] Setup CORS agar frontend bisa akses semua API
- [ ] Test integrasi end-to-end: landing page → upload → chat → Agent 2/3 → respons
- [ ] Deploy semua service ke server (VPS / Railway / Render)
- [ ] Buat `README.md` cara menjalankan project secara lokal

---

## Anggota 6 — Project Lead (Koordinasi + Dokumentasi)

Memastikan proyek berjalan on track dan siap dipresentasikan.

- [ ] Buat timeline pengerjaan dan deadline tiap anggota
- [ ] Jadwalkan sync harian selama 5 hari
- [ ] Pantau progress tiap anggota, bantu unblock kalau ada hambatan
- [ ] Pastikan format dummy dataset konsisten antar agent (koordinasi Anggota 2 & 3)
- [ ] Tulis dokumentasi teknis final proyek
- [ ] Perbarui `backlog.md` ini secara berkala
- [ ] Siapkan skenario demo yang menunjukkan ketiga agent bekerja bersama
- [ ] Review hasil akhir sebelum dikumpulkan

---

## Catatan penting

- Anggota 2 & 3 wajib selesaikan dan dokumentasikan endpoint API mereka **paling lambat akhir hari 3** — Anggota 4 tidak bisa sambungkan UI sebelum itu
- Semua anggota wajib push ke repository bersama setiap akhir hari
- Kalau stuck lebih dari 2 jam, langsung komunikasikan ke Anggota 6
- Dummy dataset dibuat bersama di hari 1 agar formatnya konsisten

---

*Last updated: Mei 2026*
