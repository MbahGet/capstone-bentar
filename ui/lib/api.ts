import { KPIResult, RCAResult } from './types';

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return _sessionId;
}

export async function sendChat(
  message: string,
  model: string = 'ollama',
  files?: File[],
): Promise<{
  response: string;
  agents_called: string[];
  sources: string[];
  kpi_result?: KPIResult;
  rca_result?: RCAResult;
}> {
  const sessionId = getSessionId();

  if (files && files.length > 0) {
    const fd = new FormData();
    fd.append('message', message);
    fd.append('sessionId', sessionId);
    fd.append('model', model);
    files.forEach((f) => fd.append('files', f, f.name));
    const res = await fetch('/api/agent1/chat', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Chat request failed');
    return res.json();
  }

  const res = await fetch('/api/agent1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, model }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json();
}

export async function uploadPDF(file: File): Promise<{ success: boolean; message?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/agent1/upload', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('PDF upload failed');
  return res.json();
}

export async function analyzeKPI(file: File, provider: string = 'ollama'): Promise<KPIResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('model_preference', provider);
  const res = await fetch('/api/agent2/analyze', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('KPI analysis failed');
  return res.json();
}

export async function analyzeRCA(file: File, provider: string = 'ollama'): Promise<RCAResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('model_preference', provider);
  const res = await fetch('/api/agent3/analyze', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('RCA analysis failed');
  return res.json();
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
