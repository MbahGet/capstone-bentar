import { KPIResult, RCAResult } from './types';

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return _sessionId;
}

export async function sendChat(query: string): Promise<{ response: string; agents_called: string[]; sources: string[] }> {
  const res = await fetch('/api/agent1/chat-ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatInput: query, sessionId: getSessionId() }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json();
}

export async function uploadPDF(file: File): Promise<{ success: boolean; message?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/agent1/upload-ollama', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('PDF upload failed');
  return res.json();
}

export async function analyzeKPI(file: File): Promise<KPIResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/agent2/analyze', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('KPI analysis failed');
  return res.json();
}

export async function analyzeRCA(file: File): Promise<RCAResult> {
  const fd = new FormData();
  // Send same integrated CSV to all 3 fields
  fd.append('production_log', file);
  fd.append('defect_data', file);
  fd.append('downtime_log', file);
  const res = await fetch('/api/agent3/analyze', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('RCA analysis failed');
  return res.json();
}

/** Pipeline: run Agent 2 (KPI) then Agent 3 (RCA) sequentially with progress callback */
export async function analyzeAll(
  file: File,
  onProgress: (step: 'kpi' | 'rca' | 'done', label: string) => void,
): Promise<{ kpi: KPIResult; rca: RCAResult }> {
  onProgress('kpi', 'Menganalisis KPI (Agent 2)...');
  const kpi = await analyzeKPI(file);

  onProgress('rca', 'Menjalankan Root Cause Analysis (Agent 3)...');
  const rca = await analyzeRCA(file);

  onProgress('done', 'Analisis selesai');
  return { kpi, rca };
}

export async function checkHealth(agent: 'agent1' | 'agent2' | 'agent3'): Promise<{
  status: string;
  latency: number;
  data?: Record<string, unknown>;
  error?: string;
}> {
  const start = Date.now();
  try {
    const res = await fetch(`/api/${agent}/health`, {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    const data = await res.json();
    return { status: res.ok ? 'online' : 'offline', latency, data };
  } catch {
    return { status: 'offline', latency: Date.now() - start, error: 'Connection failed' };
  }
}

export function writeActivityLog(entry: {
  agent: string;
  method: string;
  endpoint: string;
  statusCode: number | null;
  latency: number | null;
  error?: string;
}) {
  try {
    const logs = JSON.parse(localStorage.getItem('bentar_logs') || '[]');
    logs.unshift({ ...entry, id: Date.now().toString(), timestamp: new Date().toISOString() });
    localStorage.setItem('bentar_logs', JSON.stringify(logs.slice(0, 100)));
  } catch { /* localStorage may not be available */ }
}
