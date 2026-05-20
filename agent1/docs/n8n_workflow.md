# n8n Workflow Documentation — FactoryOps Copilot

Dokumentasi lengkap untuk n8n workflow yang sudah implemented dan tested.

## Workflow Overview

Capstone project menggunakan 2 main workflows di n8n (Agent 1):

1. **PDF Upload Workflow** — Upload PDF → Extract Text → Embed (Ollama) → Store di Qdrant
2. **Chat Workflow** — User Query → Search Qdrant → Call Agent 2/3 → Generate Response (Ollama)

---

## Workflow 1: PDF Upload Pipeline

**Purpose**: Receive PDF upload, process it, create embeddings, store in Qdrant vector database.

### Node Configuration

1. **Webhook (Upload PDF)**
   - Method: POST
   - Path: `/upload-pdf`
   - Authentication: None (or API key if needed)
   - Purpose: Receive multipart/form-data with PDF file

2. **Extract Text from PDF**
   - Input: file binary from webhook
   - Purpose: Convert PDF to text chunks
   - Output: array of text chunks

3. **Create Embeddings (Ollama)**
   - Endpoint: `http://host.docker.internal:11434/api/embeddings`
   - Model: `nomic-embed-text`
   - Purpose: Generate vector embeddings for each chunk
   - Input: text chunk
   - Output: embedding vector (384 dimensions)

4. **Store in Qdrant**
   - Endpoint: `http://qdrant:6333` (Docker network)
   - Collection: `documents`
   - Method: PUT `/collections/documents/points`
   - Purpose: Upsert embeddings + metadata into vector store
   - Metadata: filename, chunk_index, timestamp

5. **Response Node**
   - Return: `{"status": "success", "chunks": N}`
   - Purpose: Acknowledge upload to client

---

## Workflow 2: Chat Pipeline with Agent Integration

**Purpose**: Handle user queries, search relevant documents, call Agent 2/3 for analysis, return combined response.

### Node Configuration

1. **Webhook (Chat)**
   - Method: POST
   - Path: `/chat`
   - Body: `{"query": "user question here"}`
   - Purpose: Receive chat query from frontend

2. **Search Qdrant for Relevant Documents**
   - Endpoint: `http://qdrant:6333`
   - Method: POST `/collections/documents/search`
   - Purpose: Find top-k similar documents based on embedding similarity
   - Input: Query text → Embed with Ollama → Search Qdrant
   - Output: Top 5 document chunks with relevance scores

3. **Decision Node (JavaScript/Expression)**
   - Purpose: Analyze query intent
   - Decision: Does query require Agent 2 (KPI/recommendations) or Agent 3 (RCA)?
   - Examples:
     - "Cek downtime tertinggi" → Agent 2
     - "Kenapa banyak defect" → Agent 3
     - "Apa itu downtime" → Use Qdrant docs only

4. **Call Agent 2 (Conditional)**
   - Condition: If query matches KPI/recommendation keywords
   - Endpoint: `http://agent2:8000/query` (Docker network) or `http://localhost:8000/query` (local)
   - Method: POST
   - Body: `{"query": "user query"}`
   - Response: `{summary, alerts, model_metrics, top_deviations, recommendation}`
   - Purpose: Get production analytics and recommendations from Agent 2

5. **Call Agent 3 (Conditional)**
   - Condition: If query matches RCA/root-cause keywords
   - Endpoint: `http://agent3:9000/analyze-json` (Docker network) or `http://localhost:9000/analyze-json` (local)
   - Method: POST
   - Body: `{"query": "user query", "response": "", "context": {}}`
   - Response: `{summary, correlation_analysis, shap_ranking, rca_explanation}`
   - Purpose: Get root cause analysis from Agent 3

6. **Ollama Chat Model**
   - Endpoint: `http://host.docker.internal:11434/api/chat`
   - Model: `llama3.2:3b`
   - System Prompt: Industry context + instructions to use Qdrant docs + Agent responses
   - User Prompt: Combine original query + Qdrant documents + Agent 2/3 responses
   - Purpose: Generate human-friendly narrative response

7. **Response Node**
   - Return: Final chat response to client
   - Format: `{"response": "...", "sources": [...], "agents_called": [...]}`

---

## Configuration Details

### Ollama Setup (Required)

Ollama harus running di host machine atau accessible dari n8n container.

**Models used:**

- `nomic-embed-text` - Embeddings model (384 dimensions) untuk Qdrant
- `llama3.2:3b` - Chat model untuk generate responses

**Endpoints:**

- Embeddings: `http://host.docker.internal:11434/api/embeddings`
- Chat: `http://host.docker.internal:11434/api/chat`

**n8n credentials setup:**

```
Base URL: http://host.docker.internal:11434
Model (embeddings): nomic-embed-text
Model (chat): llama3.2:3b
```

### Qdrant Setup

Vector database untuk menyimpan document embeddings.

**Collection:** `documents`
**Dimensions:** 384 (sesuai nomic-embed-text output)
**Endpoint:** `http://qdrant:6333` (Docker) atau `http://localhost:6333` (lokal)

**Schema:**

```json
{
  "point_id": "unique_id",
  "vector": [embedding_384_dims],
  "payload": {
    "text": "document chunk",
    "filename": "source pdf name",
    "chunk_index": 0,
    "timestamp": "2026-05-19T..."
  }
}
```

### Agent 2 & Agent 3 Integration

**Agent 2 (KPI Analytics):**

- Port: 8000
- Endpoint: `POST /query`
- Request: `{"query": "user question"}`
- Response: KPI summary + analytics + recommendations
- Use when: User asks about downtime, efficiency, performance metrics

**Agent 3 (Root Cause Analysis):**

- Port: 9000
- Endpoint: `POST /analyze-json`
- Request: `{"query": "user question", "response": "", "context": {}}`
- Response: RCA analysis + SHAP explanations + recommendations
- Use when: User asks why defects happened, root cause analysis

---

## Implementation Notes

### Service Discovery in Docker Compose

When running with `docker-compose`:

- n8n → Agent 2: Use `http://agent2:8000`
- n8n → Agent 3: Use `http://agent3:9000`
- n8n → Qdrant: Use `http://qdrant:6333`
- n8n → Ollama: Use `http://host.docker.internal:11434` (from Windows/Mac) or adjust based on your setup

### Local Development (n8n on host)

If running n8n directly on host (not in Docker):

- Agent 2: `http://localhost:8000`
- Agent 3: `http://localhost:9000`
- Qdrant: `http://localhost:6333`
- Ollama: `http://localhost:11434`

### Prompt Engineering for Chat Node

System prompt untuk Ollama chat:

```
Kamu adalah FactoryOps Copilot - asisten AI untuk manufaktur dan operasional pabrik.
Peran: Membantu operator/supervisor menganalisis produksi dan memberikan insights.

Petunjuk:
1. Jika ada dokumen relevan dari Qdrant, gunakan informasi tersebut
2. Jika user menanyakan KPI/metrics, integrasikan hasil dari Agent 2
3. Jika user menanyakan root cause/analisis, gunakan hasil dari Agent 3
4. Berikan jawaban yang singkat, actionable, dan dalam Bahasa Indonesia
5. Jangan bermain-main atau memberikan informasi di luar konteks industri

Konteks: Anda bekerja di lingkungan manufaktur dengan mesin produksi,
KPI tracking, quality control, dan maintenance planning.
```
