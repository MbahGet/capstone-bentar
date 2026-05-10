# Timeline 5 Hari — Proyek 3 AI Agent Industrial

> Prioritas utama: alur end-to-end jalan dulu, polish belakangan.
> Anggota 4 handle semua UI. Anggota 2 & 3 wajib selesai API sebelum hari 4.

---

## Hari 1 — Setup & Fondasi

> Target akhir hari: semua environment siap, dummy data ada, masing-masing sudah mulai build.

| Anggota | Task |
|---|---|
| 1 | Daftar n8n, setup OpenAI API key, eksplor template RAG yang ada |
| 2 | Setup project Python, buat dummy CSV data produksi, coba kalkulasi OEE manual |
| 3 | Setup project Python, buat dummy dataset (log, defect, downtime), coba merge dataset |
| 4 | Setup project frontend, buat layout dasar + routing, mulai landing page |
| 5 | Setup repository, buat struktur folder, tulis `docker-compose.yml` skeleton |
| 6 | Buat grup komunikasi tim, sepakati format dummy data bersama, bagi akses repo |

---

## Hari 2 — Core Logic

> Target akhir hari: logika utama tiap agent sudah jalan di lokal, belum perlu nyambung ke UI.

| Anggota | Task |
|---|---|
| 1 | Bangun workflow n8n lengkap: Document Loader → Embeddings → Vector Store → AI Agent, test dengan 1 dokumen |
| 2 | Selesaikan KPI engine + rule-based threshold, mulai integrasi XGBoost |
| 3 | Selesaikan preprocessing + correlation analysis, mulai implementasi SHAP |
| 4 | Selesaikan landing page + form upload semua file, mulai halaman chat Agent 1 |
| 5 | Pastikan FastAPI Agent 2 & 3 bisa dijalankan via Docker, setup CORS |
| 6 | Cek progress semua anggota, identifikasi blocker, koordinasi format dummy data |

---

## Hari 3 — API Selesai (Deadline Backend)

> Target akhir hari: semua endpoint Agent 2 & 3 sudah bisa dipanggil dan return response yang benar. Ini deadline keras untuk Anggota 2 & 3.

| Anggota | Task |
|---|---|
| 1 | Test multi-dokumen, tambah memory node, implementasi logika orchestration ke Agent 2 & 3 |
| 2 | **Selesaikan** endpoint `POST /analyze`, test dengan Postman, dokumentasikan format response |
| 3 | **Selesaikan** endpoint `POST /rca`, test dengan Postman, dokumentasikan format response |
| 4 | Sambungkan chat interface ke n8n webhook, mulai halaman Agent 2 (layout + upload) |
| 5 | Test semua endpoint, pastikan Docker Compose jalan mulus, mulai setup di server |
| 6 | Review output tiap agent, catat gap, update backlog |

---

## Hari 4 — Sambung FE ke BE

> Target akhir hari: alur end-to-end jalan — dari landing page upload file, chat di Agent 1, sampai hasil Agent 2/3 tampil di layar.

| Anggota | Task |
|---|---|
| 1 | Polish system prompt, test edge case, pastikan HTTP Request node ke Agent 2 & 3 jalan |
| 2 | Bantu Anggota 4 debug jika ada masalah format response API |
| 3 | Bantu Anggota 4 debug jika ada masalah format response API |
| 4 | Sambungkan halaman Agent 2 ke endpoint FastAPI, tampilkan KPI + rekomendasi. Sambungkan halaman Agent 3, tampilkan SHAP chart + fishbone |
| 5 | Deploy semua service ke server, test akses dari luar lokal, fix networking |
| 6 | Lakukan full demo run end-to-end, catat semua bug yang muncul |

---

## Hari 5 — Testing, Fix & Demo

> Target akhir hari: semua agent bisa didemonstrasikan dengan skenario nyata tanpa error kritis.

| Anggota | Task |
|---|---|
| 1 | Upload dokumen SOP/manual lebih realistis, test skenario demo final |
| 2 | Fix bug yang ditemukan hari 4 |
| 3 | Fix bug yang ditemukan hari 4 |
| 4 | Polish UI semua halaman, pastikan responsif, fix tampilan yang aneh |
| 5 | Pastikan deployment stabil, tulis `README.md` cara menjalankan project |
| 6 | Finalisasi dokumentasi teknis, siapkan skenario demo, latihan presentasi |

---

## Skenario demo yang disarankan

Tunjukkan ketiga agent bekerja sebagai satu sistem:

1. Upload SOP QC + CSV produksi + log mesin di landing page
2. Masuk ke chat, tanya: *"Defect rate mesin X sudah 2 hari berturut di atas 3%, apa yang harus dilakukan?"*
3. Agent 1 ambil dari SOP → panggil Agent 3 untuk RCA → jawab dengan rekomendasi lengkap
4. Tanya lagi: *"Berapa OEE minggu ini dan apa rekomendasinya?"*
5. Agent 1 panggil Agent 2 → tampilkan KPI + rekomendasi tindakan

---

## Fallback — Kalau Waktu Mepet

| Fitur | Versi penuh | Versi cepat |
|---|---|---|
| SHAP analysis | XGBoost + TreeExplainer | Ranking korelasi biasa |
| Output Agent 3 | Generate PDF | Tampilan web saja |
| XGBoost Agent 2 | Model terlatih | Rule-based threshold |
| Orchestration Agent 1 | Otomatis deteksi | Manual pilih agent via chat |
| UI | Polished + responsif | Fungsional saja |

---

## Aturan main

- Setiap akhir hari, semua anggota **push progress ke repo** meski belum selesai
- Kalau stuck lebih dari 2 jam, **langsung minta bantuan** — jangan simpan sendiri
- Hari 5 **tidak boleh ada fitur baru**, fokus fix dan polish saja
- Anggota 2 & 3: endpoint harus selesai hari 3 — Anggota 4 bergantung pada kalian

---

*Last updated: Mei 2026*
