/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentHealth, LogEntry } from '@/lib/types';
import { checkHealth, uploadPDF, analyzeKPI, analyzeRCA, writeActivityLog } from '@/lib/api';
import { TabbedAgentLogPanel } from '@/components/labs/TabbedAgentLogPanel';
import ResponseModal, { ModalPayload } from '@/components/chat/ResponseModal';
import { Play, RefreshCw, Loader2 } from 'lucide-react';
import { AgentDetailPopup } from '@/components/monitor/AgentDetailPopup';
import { DropZone } from '@/components/monitor/DropZoneFile';
import { StatusToggle } from '@/components/monitor/StatusToggle';
import { AgentLogEntry } from '@/utils/AgentLogEntry';

const AGENTS = [
  { id: 'agent1' as const, label: 'Agent Consultant' },
  { id: 'agent2' as const, label: 'Agent KPI'        },
  { id: 'agent3' as const, label: 'Agent RCA Analyst' },
];

const DEFAULT_HEALTH: AgentHealth = { status: 'unknown', latency: null, lastCheck: null };

export default function LabsPage() {
  /* Health */
  const [health, setHealth] = useState<Record<string, AgentHealth>>({
    agent1: DEFAULT_HEALTH, agent2: DEFAULT_HEALTH, agent3: DEFAULT_HEALTH,
  });
  const [globalLogs, setGlobalLogs] = useState<LogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* SOP upload (left panel — chatbot RAG)
     - File object lives only in memory (browser limitation).
     - We persist the *filename* in localStorage so the UI survives navigation.
     - On remount we restore the display name; user re-selects the file to re-upload. */
  const [sopFile, setSopFile]           = useState<File | null>(null);
  const [sopFileName, setSopFileName]   = useState<string>(() => {
    try { return localStorage.getItem('sop_filename') ?? ''; } catch { return ''; }
  });
  const [sopUploading, setSopUploading] = useState(false);

  /* Testing panel */
  const [csvFile, setCsvFile]         = useState<File | null>(null);
  const [testSopFile, setTestSopFile] = useState<File | null>(null);

  /* Pipeline state: 0=idle, 1=a1 done, 2=a2 done, 3=all done */
  const [pipelineStep, setPipelineStep] = useState(0);
  const [running, setRunning]           = useState(false);

  /* Per-agent test logs — persisted to localStorage across navigation */
  function loadStoredLogs(key: string): AgentLogEntry[] {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '[]') as Record<string, unknown>[];
      return raw.map((l) => ({ ...l, timestamp: new Date(l.timestamp as string) })) as AgentLogEntry[];
    } catch { return []; }
  }
  function saveStoredLogs(key: string, logs: AgentLogEntry[]) {
    try { localStorage.setItem(key, JSON.stringify(logs)); } catch { /* quota */ }
  }

  const [a1Logs, setA1Logs] = useState<AgentLogEntry[]>(() => loadStoredLogs('test_logs_agent1'));
  const [a2Logs, setA2Logs] = useState<AgentLogEntry[]>(() => loadStoredLogs('test_logs_agent2'));
  const [a3Logs, setA3Logs] = useState<AgentLogEntry[]>(() => loadStoredLogs('test_logs_agent3'));

  /* Sync logs → localStorage on every change */
  useEffect(() => { saveStoredLogs('test_logs_agent1', a1Logs); }, [a1Logs]);
  useEffect(() => { saveStoredLogs('test_logs_agent2', a2Logs); }, [a2Logs]);
  useEffect(() => { saveStoredLogs('test_logs_agent3', a3Logs); }, [a3Logs]);

  /* Delete single entry */
  const handleDeleteEntry = useCallback((agent: 'agent1' | 'agent2' | 'agent3', id: string) => {
    if (agent === 'agent1') setA1Logs((p) => p.filter((e) => e.id !== id));
    if (agent === 'agent2') setA2Logs((p) => p.filter((e) => e.id !== id));
    if (agent === 'agent3') setA3Logs((p) => p.filter((e) => e.id !== id));
  }, []);

  /* Provider selection (Groq / Ollama) for analyze calls */
  const [provider, setProvider] = useState<'groq' | 'ollama'>(() => {
    try { return (localStorage.getItem('test_provider') as 'groq' | 'ollama') ?? 'groq'; } catch { return 'groq'; }
  });
  const handleProviderChange = useCallback((p: 'groq' | 'ollama') => {
    setProvider(p);
    try { localStorage.setItem('test_provider', p); } catch { /* ignore */ }
  }, []);

  /* Result modal */
  const [modal, setModal] = useState<ModalPayload | null>(null);

  /* Agent detail popup */
  const [detailAgent, setDetailAgent] = useState<string | null>(null);

  const runHealthChecks = useCallback(async () => {
    const results = await Promise.allSettled(AGENTS.map((a) => checkHealth(a.id)));
    const now = new Date();
    const newLogs: LogEntry[] = [];

    setHealth(() => {
      const updated: Record<string, AgentHealth> = {};
      results.forEach((r, i) => {
        const agent = AGENTS[i];
        if (r.status === 'fulfilled') {
          const { status, latency, data, error } = r.value;
          updated[agent.id] = { status: status as AgentHealth['status'], latency, lastCheck: now, details: data as Record<string, unknown>, error };
          newLogs.push({ id: `${now.getTime()}-${agent.id}`, agent: agent.id, method: 'GET', endpoint: '/health', statusCode: status === 'online' ? 200 : null, latency, timestamp: now, error: status === 'offline' ? 'Offline' : undefined });
        } else {
          updated[agent.id] = { status: 'offline', latency: null, lastCheck: now, error: 'Check failed' };
          newLogs.push({ id: `${now.getTime()}-${agent.id}`, agent: agent.id, method: 'GET', endpoint: '/health', statusCode: null, latency: null, timestamp: now, error: 'Check failed' });
        }
      });
      return updated;
    });

    let externalLogs: LogEntry[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem('bentar_logs') || '[]');
      externalLogs = stored.map((l: Record<string, unknown>) => ({ ...l, timestamp: new Date(l.timestamp as string) })) as LogEntry[];
    } catch { /* ignore */ }

    setGlobalLogs((prev) => {
      const combined = [...newLogs, ...externalLogs, ...prev]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 100);
      const seen = new Set<string>();
      return combined.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runHealthChecks();  // async — setState calls happen after await, not synchronously
    intervalRef.current = setInterval(runHealthChecks, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runHealthChecks]);

  /* Upload SOP (chatbot RAG) */
  const handleUploadSop = useCallback(async (file: File) => {
    setSopFile(file);
    setSopFileName(file.name);
    try { localStorage.setItem('sop_filename', file.name); } catch { /* ignore */ }

    setSopUploading(true);
    try {
      await uploadPDF(file);
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: 200, latency: null });
    } catch {
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: null, latency: null, error: 'Upload failed' });
    } finally {
      setSopUploading(false);
    }
  }, []);

  /* Pipeline */
  function addLog(
    setter: React.Dispatch<React.SetStateAction<AgentLogEntry[]>>,
    entry: Omit<AgentLogEntry, 'id'>
  ) {
    setter((prev) => [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...prev]);
  }

  const runTest = useCallback(async () => {
    setRunning(true);
    setPipelineStep(0);

    /* Step 1: test Agent 1 health */
    const start = Date.now();
    try {
      const { status, latency, data, error } = await checkHealth('agent1');
      const ok = status === 'online';
      const code = ok ? 200 : null;
      addLog(setA1Logs, {
        agent: 'agent1', method: 'GET', endpoint: '/health',
        statusCode: code, latency: latency ?? Date.now() - start,
        timestamp: new Date(),
        error: ok ? undefined : (error ?? 'Offline'),
        detail: data,
      });
      writeActivityLog({ agent: 'agent1', method: 'GET', endpoint: '/health', statusCode: code, latency: latency ?? null });

      if (ok) {
        if (testSopFile) {
          try {
            await uploadPDF(testSopFile);
            addLog(setA1Logs, { agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: 200, latency: null, timestamp: new Date() });
          } catch {
            addLog(setA1Logs, { agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: null, latency: null, timestamp: new Date(), error: 'Upload failed' });
          }
        }
        setPipelineStep(1);
      } else {
        addLog(setA1Logs, { agent: 'agent1', method: '—', endpoint: 'Pipeline stopped', statusCode: null, latency: null, timestamp: new Date(), error: 'Agent 1 offline' });
      }
    } catch (err) {
      addLog(setA1Logs, { agent: 'agent1', method: 'GET', endpoint: '/health', statusCode: null, latency: Date.now() - start, timestamp: new Date(), error: String(err) });
    } finally {
      setRunning(false);
    }
  }, [testSopFile]);

  const runNext = useCallback(async () => {
    if (!csvFile) return;
    setRunning(true);

    if (pipelineStep === 1) {
      /* Step 2: Agent 2 KPI */
      const start = Date.now();
      try {
        const result = await analyzeKPI(csvFile, provider);
        const latency = Date.now() - start;
        addLog(setA2Logs, { agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: 200, latency, timestamp: new Date(), detail: result });
        writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });
        setPipelineStep(2);
        setModal({ type: 'kpi', result });
      } catch (err) {
        const latency = Date.now() - start;
        addLog(setA2Logs, { agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: null, latency, timestamp: new Date(), error: String(err) });
        addLog(setA2Logs, { agent: 'agent2', method: '—', endpoint: 'Pipeline stopped', statusCode: null, latency: null, timestamp: new Date(), error: 'Agent 2 error' });
        writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: null, latency, error: 'Analysis failed' });
      }
    } else if (pipelineStep === 2) {
      /* Step 3: Agent 3 RCA */
      const start = Date.now();
      try {
        const result = await analyzeRCA(csvFile, provider);
        const latency = Date.now() - start;
        addLog(setA3Logs, { agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: 200, latency, timestamp: new Date(), detail: result });
        writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });
        setPipelineStep(3);
        setModal({ type: 'rca', result });
      } catch (err) {
        const latency = Date.now() - start;
        addLog(setA3Logs, { agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: null, latency, timestamp: new Date(), error: String(err) });
        writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: null, latency, error: 'RCA failed' });
      }
    }

    setRunning(false);
  }, [pipelineStep, csvFile, provider]);

  /* Per-agent activity logs for left panel */
  const toEntry = (l: LogEntry): AgentLogEntry => ({
    id: l.id, agent: l.agent, method: l.method, endpoint: l.endpoint,
    statusCode: l.statusCode, latency: l.latency, timestamp: l.timestamp, error: l.error,
  });
  const a1ActivityLogs = globalLogs.filter(l => l.agent === 'agent1').map(toEntry);
  const a2ActivityLogs = globalLogs.filter(l => l.agent === 'agent2').map(toEntry);
  const a3ActivityLogs = globalLogs.filter(l => l.agent === 'agent3').map(toEntry);

  /* Render */
  return (
    <div className="h-full px-[10%] overflow-hidden bg-[#0a0e1a] flex flex-col animate-tab-fade">

      {/* Main content */}
      <div className="flex flex-1 min-h-0 gap-4 px-4 pt-14 pb-4">

        {/* LEFT PANEL */}
        <aside className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* SOP File */}
          <div className="rounded-2xl bg-[#141c2e] border border-[#1e2d4a] p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3">SOP File</p>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#1e2d4a] bg-[#0f1629] hover:border-blue-500/40 hover:bg-[#0a0e1a] transition-all cursor-pointer px-4 py-5">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadSop(f); e.target.value = ''; }}
              />
              {sopUploading ? (
                <Loader2 size={28} className="text-blue-400 animate-spin" />
              ) : (
                <img src="/icon/ic-pdf.svg" alt="" width={28} height={28} className={sopFileName ? 'opacity-100' : 'opacity-30'} />
              )}
              <span className="text-xs text-slate-400 text-center">
                {sopUploading ? 'Uploading...' : sopFileName || 'Upload a PDF file'}
              </span>
              {sopFileName && !sopFile && (
                <span className="text-[10px] text-amber-400/70 text-center leading-snug">
                  Navigasi ulang — pilih file lagi untuk re-upload
                </span>
              )}
            </label>
          </div>

          {/* Machine Status */}
          <div className="rounded-2xl bg-[#141c2e] border border-[#1e2d4a] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400">Machine Status</p>
              <button
                onClick={runHealthChecks}
                className="w-6 h-6 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
                aria-label="Refresh health"
              >
                <RefreshCw size={12} />
              </button>
            </div>
            {AGENTS.map((meta) => {
              const h = health[meta.id];
              const online = h.status === 'online';
              return (
                <div key={meta.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-slate-300 truncate">{meta.label}</span>
                  <StatusToggle active={online} onRefresh={runHealthChecks} />
                  <button
                    onClick={() => setDetailAgent(meta.id)}
                    className="opacity-30 hover:opacity-80 transition-opacity ml-1"
                    aria-label="Detail"
                  >
                    <img src="/icon/ic-maximize.svg" alt="" width={12} height={12} />
                  </button>
                </div>
              );
            })}
          </div>

        </aside>

        {/* RIGHT PANEL */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="rounded-2xl bg-[#141c2e] border border-[#1e2d4a] p-6 flex flex-col">
            <p className="text-base font-semibold text-white mb-5">Agent Testing</p>

            {/* Upload row */}
            <div className="flex gap-3 mb-5">
              <DropZone
                label="Upload a CSV file"
                accept=".csv"
                icon={<img src="/icon/ic-csv.svg" alt="" width={28} height={28} />}
                file={csvFile}
                onFile={setCsvFile}
              />
              <DropZone
                label="Upload a SOP"
                accept=".pdf"
                icon={<img src="/icon/ic-pdf.svg" alt="" width={28} height={28} />}
                file={testSopFile}
                onFile={setTestSopFile}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={runTest}
                disabled={running}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-700/30"
              >
                {running && pipelineStep === 0 ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Run a test
              </button>

              {pipelineStep > 0 && pipelineStep < 3 && (
                <button
                  onClick={runNext}
                  disabled={running || !csvFile}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 text-white text-sm font-semibold hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {running ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <img src="/icon/ic-next-small.svg" alt="" width={14} height={14} />
                  )}
                  next
                </button>
              )}

              {pipelineStep === 3 && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Pipeline selesai
                </span>
              )}
            </div>

            {/* Result section */}
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Result</p>
            <TabbedAgentLogPanel
              a1Logs={a1Logs}
              a2Logs={a2Logs}
              a3Logs={a3Logs}
              onDeleteEntry={handleDeleteEntry}
              provider={provider}
              onProviderChange={handleProviderChange}
              className="flex-1 min-h-0"
            />
          </div>
        </main>
      </div>

      {/* Agent detail popup */}
      {detailAgent && (() => {
        const logs = detailAgent === 'agent1' ? a1ActivityLogs : detailAgent === 'agent2' ? a2ActivityLogs : a3ActivityLogs;
        return (
          <AgentDetailPopup
            agentId={detailAgent}
            logs={logs}
            onClose={() => setDetailAgent(null)}
          />
        );
      })()}

      {/* KPI / RCA result modal */}
      <ResponseModal payload={modal} onClose={() => setModal(null)} />
    </div>
  );
}