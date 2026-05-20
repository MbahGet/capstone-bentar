# Agent 1 — n8n + RAG (PDF Upload + Chat with Agent 2/3 Integration)

**Status**: ✅ Production Ready - All components tested and integrated

## Overview

Agent 1 adalah orchestrator utama (n8n) untuk FactoryOps Copilot yang:

1. **Menerima upload PDF** → Extract text → Embed (Ollama nomic-embed-text) → Store di Qdrant
2. **Chat interface** → Query user → Search Qdrant → Call Agent 2/3 → Generate response (Ollama llama3.2:3b)
3. **Multi-agent integration** → Seamlessly call Agent 2 (KPI) dan Agent 3 (RCA) based on query intent

## Architecture

```
┌─────────────┐
│   Frontend  │
│  (Browser)  │
└──────┬──────┘
       │
       ├─ POST /upload-pdf  ──→ [n8n] ──→ Ollama Embeddings ──→ Qdrant
       │
       └─ POST /chat  ──→ [n8n] ──→ Search Qdrant
                              ├─→ Agent 2 /query (if KPI intent)
                              ├─→ Agent 3 /analyze-json (if RCA intent)
                              └─→ Ollama Chat ──→ Response
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Ollama running on host (models: `nomic-embed-text`, `llama3.2:3b`, `llama3.1:8b`)
- Python 3.11+ (for test scripts)

## Files in This Directory

```
agent1/
├── README.md                      # This file
├── docs/
│   └── n8n_workflow.md           # Complete workflow documentation
├── provision/
│   ├── import_workflow.py        # Auto-import workflow on startup
│   └── create_qdrant_collection.py # Initialize Qdrant collection
├── workflows/
│   └── n8n_workflow.json         # n8n workflow export (JSON)
└── n8n_data/                      # n8n database & config (generated on first run)
```

## Running Agent 1

### 1. Start All Services

From repository root:

```bash
cd d:\Github\capstone-bentar
docker compose down --remove-orphans
docker compose up -d --build
```

This will:

- ✅ Start n8n at http://localhost:5678
- ✅ Auto-provision workflows from `workflows/n8n_workflow.json`
- ✅ Create Qdrant collection "documents"
- ✅ Connect Agent 2 (port 8000) and Agent 3 (port 9000)

### 2. Access n8n

Open browser: **http://localhost:5678**

Login with:

- Email: `admin@gmail.com`
- Password: `Admin1234`

### 3. Test Upload PDF

Use provided script:

```bash
python agent1/provision/upload_example.py path/to/sample.pdf
```

Or use curl:

```bash
curl -X POST "http://localhost:5678/webhook/upload-pdf" \
  -F "file=@path/to/sample.pdf"
```

### 4. Test Chat

```bash
curl -X POST "http://localhost:5678/webhook/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "Apa itu downtime?"}'
```

## Configuration

### Environment Variables (docker-compose.yml)

```yaml
services:
  agent1: # n8n
    environment:
      N8N_EMAIL: admin@gmail.com
      N8N_PASSWORD: Admin1234
      N8N_HOST: 0.0.0.0
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      N8N_WEBHOOK_URL: http://localhost:5678
```

### Credentials in n8n

After login, create credentials for:

1. **Ollama (Embeddings)**
   - Type: HTTP Header Auth
   - URL: `http://host.docker.internal:11434`
   - Headers: None (Ollama doesn't require auth)

2. **Ollama (Chat)**
   - Same as above

3. **Qdrant**
   - Type: HTTP Header Auth
   - URL: `http://qdrant:6333`
   - Headers: None (Qdrant auth optional)

## Workflow Details

See `docs/n8n_workflow.md` for complete node-by-node documentation including:

- PDF Upload Pipeline configuration
- Chat Pipeline with Agent 2/3 integration
- Ollama endpoint setup
- Qdrant vector store schema
- Prompt engineering guidelines
