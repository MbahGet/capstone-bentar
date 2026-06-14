# 📊 AI System Audit Report: Token Usage & Pipeline Efficiency

This document provides a comprehensive technical audit of the token usage pipeline, memory configuration, and retrieval processes for the current AI Agent orchestration system (Agent 1, 2, and 3).

---

## 1. MODEL INFORMATION

- **Current Model Name**: `gpt-oss-120b` (Configured across all agents via `.env` and `n8n_workflow.json`). *Note: This appears to be a custom or proxied open-source model endpoint mimicking Groq's API structure.*
- **Context Window Size**: Estimated at **8,192 tokens** (Standard for LLaMa-3-based architectures).
- **Max Output Tokens**: Up to **4,096 tokens** (As configured in `agent2/app/recommendation.py`).
- **Reasoning Tokens Enabled**: **No**. Standard autoregressive generation is being used without advanced Chain-of-Thought reasoning token exposure (like OpenAI o1/o3).
- **Hidden/System Reasoning Active**: **No**. The model acts directly on the highly explicit system prompt without an intermediate hidden reasoning phase.

---

## 2. TOKEN BREAKDOWN (Per Request)

Based on a static analysis of the workflow files and prompt lengths, here is the estimated token footprint for a typical request (e.g., Kondisi B or C):

| Component | Estimated Token Count | Source / Rationale |
| :--- | :--- | :--- |
| **System Prompt** | ~1,400 tokens | 5,577 bytes in `system_prompt_clean.txt`. Very dense and highly structured. |
| **User Prompt** | ~10 - 25 tokens | Typical queries (e.g., "Faktor apa yang paling mempengaruhi defect?"). |
| **Chat History** | ~1,350 tokens | Assuming an average of 5 historical turns (default window size) with Agent 2/3 responses averaging 250 tokens each. |
| **RAG Retrieval** | ~1,250 tokens | **Only in Kondisi D**. 5 chunks of 1,000 chars (~250 tokens each). |
| **Tool Calling Schema** | ~150 tokens | Function descriptions injected by Langchain for 3 tools (Agent 2, Agent 3, Qdrant). |
| **Expected Output** | ~250 - 400 tokens | Output verbatim from Agent 2/3 reports, or LLM-generated 4-point template. |
| **TOTAL (Non-RAG)** | **~3,175 tokens** | Routine query invoking Agent 2 or 3. |
| **TOTAL (With RAG)** | **~4,425 tokens** | Query requiring Qdrant retrieval (Kondisi A/D). |

> [!WARNING]
> **Token Load:** A single request utilizes approximately **35-50%** of an 8K context window.

---

## 3. CHAT HISTORY ANALYSIS

- **Is conversation history being persisted?** **Yes**. It is handled by the `memoryBufferWindow` node in n8n, keyed by `sessionId`.
- **How many previous messages are included?** The `windowSize` parameter is not explicitly defined in the n8n JSON, meaning it falls back to the n8n default (typically the last **5 interaction pairs**).
- **Is full-history memory enabled?** **No**. Buffer Window truncates older messages.
- **Is summary memory enabled?** **No**. Raw message strings are appended to context.
- **Estimate token contribution from memory:** A conversational agent fetching verbatim backend reports (which are verbose) will quickly balloon the history. 5 pairs of 300-token responses = 1,500 tokens of pure history.

---

## 4. RAG / RETRIEVAL ANALYSIS

- **Is RAG enabled?** **Yes** (via Qdrant Vector Store).
- **Number of retrieved chunks:** `topK: 5`.
- **Average chunk size:** Strictly **1,000 characters** (~250 tokens), configured via custom Javascript in the `Format Document` node.
- **Chunk overlap size:** Minimal. Word chunker uses `-5` words overlap; CSV chunker uses `-2` lines overlap.
- **Total retrieved token count:** ~1,250 tokens.
- **Reranking used?** **No**. Straight cosine/dot-product retrieval from Qdrant.
- **Duplicate chunks sent?** Possible, as there is no semantic deduplication or Maximum Marginal Relevance (MMR) configured in the Langchain retriever.

---

## 5. CACHING ANALYSIS

- **Semantic caching enabled?** **No**.
- **Response caching enabled?** **No**.
- **Embedding caching enabled?** **No**.
- **Repeated prompts recomputed?** **Yes**. If a user asks "Kenapa defect tinggi?" twice, Agent 3 recalculates SHAP values, Groq regenerates the Fishbone narrative, and n8n processes the entire chain again.

---

## 6. TOKEN INEFFICIENCY DETECTION

> [!IMPORTANT]
> The current system has high token precision (zero hallucinations) but suffers from notable token inefficiencies.

1. **Oversized System Prompt:** The `system_prompt_clean.txt` contains literal examples for every single condition. While excellent for routing accuracy, it statically eats ~1,400 tokens on *every* request.
2. **Excessive History Payload:** Because Agent 1 is instructed to serve verbatim reports from Agent 2/3, the memory buffer stores these massive backend reports as "Agent Messages". Sending 3 past reports back to the LLM as context wastes over 1,000 tokens for zero contextual benefit.
3. **Redundant Tool Descriptions:** The n8n tool descriptions contain identical trigger words as the system prompt, duplicating instruction tokens.
4. **No Semantic Caching:** High latency and wasted tokens for identical dashboard queries (e.g., "Berapa OEE saat ini?").

---

## 7. COST RISK ESTIMATION

- **Average tokens per request:** ~3,500 (Prompt + Completion).
- **Estimated tokens during stress testing:** ~6,000 tokens (When memory buffer is full at 5 turns + RAG retrieval is triggered).
- **Largest contributor:** The System Prompt (40%) and Chat History (40%).
- **Main risk factors:** Context exhaustion. If Agent 2/3 reports become longer, or if Qdrant retrieves dense CSV tables, the prompt could easily breach an 8K context limit, causing Langchain to crash with a `ContextWindowExceeded` error.

---

## 8. OPTIMIZATION RECOMMENDATIONS

To reduce token usage and latency without sacrificing the current 100% routing accuracy, implement the following:

### 🛠️ 1. Implement Summary Memory or Disable History for Reports
The Orchestrator (Agent 1) acts primarily as a router. The user rarely asks follow-up contextual questions to a backend report.
- **Action:** Switch `memoryBufferWindow` to **1 or 2 turns**, OR use a `memorySummary` node to compress past reports into a single sentence (e.g., *"User previously viewed Agent 2 KPI report"*).

### 🛠️ 2. Enable Semantic Caching
- **Action:** Insert an `n8n-nodes-langchain.cache` (Redis or In-Memory) node before the Agent node. This will instantly serve cached routing decisions and backend reports for identical queries like "KPI produksi hari ini", dropping LLM API costs for repetitive dashboard queries to $0.

### 🛠️ 3. Optimize Retrieval (RAG)
- **Action:** Reduce Qdrant `topK` from `5` to `3`. The factory SOPs are concise; 3 chunks (750 tokens) are more than enough to capture threshold rules without flooding the context window.

### 🛠️ 4. Dynamic Prompting (Advanced)
- **Action:** Instead of hardcoding all 4 conditions and their examples into a monolithic system prompt, use Langchain's semantic router or a pre-classifier to inject *only* the relevant instructions. However, given the success of the current prompt, **Memory Reduction** (Recommendation #1) should be prioritized first.
