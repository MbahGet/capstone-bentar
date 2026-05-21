'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentHealth, LogEntry, UploadedFile } from '@/lib/types';
import { checkHealth, uploadPDF, analyzeKPI, analyzeRCA, writeActivityLog } from '@/lib/api';
import AgentCard from '@/components/monitor/AgentCard';
import LogStream from '@/components/monitor/LogStream';
import PDFUpload from '@/components/upload/PDFUpload';
import CSVUpload from '@/components/upload/CSVUpload';
import ResponseModal, { ModalPayload } from '@/components/chat/ResponseModal';
import {
  RefreshCw, ShieldCheck, ShieldAlert,
  FileText, GitBranch, BarChart3, CheckCircle, Loader2, Zap,
} from 'lucide-react';

/* ─── Agent definitions ─────────────────────────────────────────────────── */
const AGENTS = [
  {
    id: 'agent1' as const,
    name: 'Orchestrator',
    role: 'Routing & RAG Engine',
    port: 5678,
    technology: 'n8n + Qdrant',
    models: 'nomic-embed-text + Groq LLaMA 3.3',
  },
  {
    id: 'agent2' as const,
    name: 'KPI Analyst',
    role: 'Production Decision Support',
    port: 8000,
    technology: 'FastAPI + XGBoost',
    models: 'Groq LLaMA 3.3 70B',
  },
  {
    id: 'agent3' as const,
    name: 'RCA Analyst',
    role: 'Root Cause Analysis',
    port: 9000,
    technology: 'FastAPI + SHAP',
    models: 'Groq LLaMA 3.3 70B',
  },
];

const DEFAULT_HEALTH: AgentHealth = { status: 'unknown', latency: null, lastCheck: null };

function formatLastUpdated(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ─── Shared sub-components ─────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">{children}</div>
  );
}

function FilePill({ file }: { file: UploadedFile }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141c2e] border border-[#1e2d4a]">
      <FileText size={12} className="text-slate-600 shrink-0" />
      <span className="text-xs text-slate-400 truncate flex-1">{file.name}</span>
      <span className={`text-xs shrink-0 ${
        file.status === 'done' ? 'text-emerald-500' : file.status === 'error' ? 'text-red-400' : 'text-amber-400'
      }`}>
        {file.status === 'done' ? '✓' : file.status === 'error' ? '✗' : '…'}
      </span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function MonitorPage() {

  /* Health checks */
  const [health, setHealth] = useState<Record<string, AgentHealth>>({
    agent1: DEFAULT_HEALTH,
    agent2: DEFAULT_HEALTH,
    agent3: DEFAULT_HEALTH,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Tool state */
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [rcaLoading, setRcaLoading] = useState(false);
  const [rcaFiles, setRcaFiles] = useState<{ productionLog?: File; defectData?: File; downtimeLog?: File }>({});
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const [a1Testing, setA1Testing] = useState(false);

  /* ── Health check logic ───────────────────────────────────────────────── */
  const runHealthChecks = useCallback(async () => {
    setHealth((prev) => ({
      agent1: { ...prev.agent1, status: 'checking' },
      agent2: { ...prev.agent2, status: 'checking' },
      agent3: { ...prev.agent3, status: 'checking' },
    }));

    const results = await Promise.allSettled(AGENTS.map((a) => checkHealth(a.id)));
    const now = new Date();
    const newLogs: LogEntry[] = [];

    setHealth(() => {
      const updated: Record<string, AgentHealth> = {};
      results.forEach((r, i) => {
        const agent = AGENTS[i];
        if (r.status === 'fulfilled') {
          const { status, latency, data, error } = r.value;
          updated[agent.id] = {
            status: status as AgentHealth['status'],
            latency,
            lastCheck: now,
            details: data as Record<string, unknown> | undefined,
            error,
          };
          newLogs.push({
            id: `${now.getTime()}-${agent.id}`,
            agent: agent.id,
            method: 'GET',
            endpoint: '/health',
            statusCode: status === 'online' ? 200 : null,
            latency,
            timestamp: now,
            error: status === 'offline' ? 'Offline' : undefined,
          });
        } else {
          updated[agent.id] = { status: 'offline', latency: null, lastCheck: now, error: 'Check failed' };
          newLogs.push({
            id: `${now.getTime()}-${agent.id}`,
            agent: agent.id,
            method: 'GET',
            endpoint: '/health',
            statusCode: null,
            latency: null,
            timestamp: now,
            error: 'Check failed',
          });
        }
      });
      return updated;
    });

    let externalLogs: LogEntry[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem('bentar_logs') || '[]');
      externalLogs = stored.map((l: Record<string, unknown>) => ({
        ...l,
        timestamp: new Date(l.timestamp as string),
      })) as LogEntry[];
    } catch { /* ignore */ }

    setLogs((prev) => {
      const combined = [...newLogs, ...externalLogs, ...prev]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 100);
      const seen = new Set<string>();
      return combined.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
    });

    setLastUpdated(now);
  }, []);

  const onlineCount = Object.values(health).filter((h) => h.status === 'online').length;
  const allOnline = onlineCount === AGENTS.length;

  useEffect(() => { runHealthChecks(); }, [runHealthChecks]);

  useEffect(() => {
    if (!polling) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const ms = allOnline ? 30000 : 5000;
    intervalRef.current = setInterval(runHealthChecks, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [polling, allOnline, runHealthChecks]);

  /* ── Tool handlers ────────────────────────────────────────────────────── */
  const addFile = (name: string, size: number, type: 'pdf' | 'csv', status: UploadedFile['status']): UploadedFile => {
    const f: UploadedFile = { id: Date.now().toString(), name, size, type, uploadedAt: new Date(), status };
    setUploadedFiles((prev) => [f, ...prev].slice(0, 10));
    return f;
  };

  const handleUploadPDF = useCallback(async (file: File) => {
    const f = addFile(file.name, file.size, 'pdf', 'uploading');
    try {
      await uploadPDF(file);
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: 200, latency: null });
      setUploadedFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: 'done' } : x)));
    } catch {
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: null, latency: null, error: 'Upload failed' });
      setUploadedFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: 'error' } : x)));
      throw new Error('Upload failed');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyzeKPI = useCallback(async (file: File) => {
    setKpiLoading(true);
    try {
      const start = Date.now();
      const result = await analyzeKPI(file);
      writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: 200, latency: Date.now() - start });
      setModal({ type: 'kpi', result });
    } catch {
      writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: null, latency: null, error: 'Analysis failed' });
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const handleAnalyzeRCA = useCallback(async () => {
    const { productionLog, defectData, downtimeLog } = rcaFiles;
    if (!productionLog || !defectData || !downtimeLog) return;
    setRcaLoading(true);
    try {
      const start = Date.now();
      const result = await analyzeRCA(productionLog, defectData, downtimeLog);
      writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: 200, latency: Date.now() - start });
      setModal({ type: 'rca', result });
    } catch {
      writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: null, latency: null, error: 'RCA failed' });
    } finally {
      setRcaLoading(false);
    }
  }, [rcaFiles]);

  const handleTestAgent1 = useCallback(async () => {
    setA1Testing(true);
    setHealth((prev) => ({ ...prev, agent1: { ...prev.agent1, status: 'checking' } }));
    try {
      const { status, latency, data, error } = await checkHealth('agent1');
      const now = new Date();
      setHealth((prev) => ({
        ...prev,
        agent1: {
          status: status as AgentHealth['status'],
          latency,
          lastCheck: now,
          details: data as Record<string, unknown> | undefined,
          error,
        },
      }));
      writeActivityLog({ agent: 'agent1', method: 'GET', endpoint: '/health', statusCode: status === 'online' ? 200 : null, latency });
    } catch {
      setHealth((prev) => ({ ...prev, agent1: { status: 'offline', latency: null, lastCheck: new Date(), error: 'Test failed' } }));
    } finally {
      setA1Testing(false);
    }
  }, []);

  const rcaReady = !!rcaFiles.productionLog && !!rcaFiles.defectData && !!rcaFiles.downtimeLog;
  const pdfFiles = uploadedFiles.filter((f) => f.type === 'pdf');

  /* ── Per-agent tool sections ─────────────────────────────────────────── */
  const agent1Tools = (
    <>
      <SectionLabel>Dokumen Referensi</SectionLabel>
      <p className="text-xs text-slate-600 leading-relaxed">
        Upload SOP / manual PDF sebagai basis pengetahuan Agent 1 (RAG).
      </p>
      <PDFUpload onUpload={handleUploadPDF} />
      {pdfFiles.length > 0 && (
        <div className="space-y-1">
          {pdfFiles.slice(0, 4).map((f) => (
            <FilePill key={f.id} file={f} />
          ))}
        </div>
      )}
      {/* Test button */}
      <button
        onClick={handleTestAgent1}
        disabled={a1Testing}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {a1Testing ? (
          <><Loader2 size={13} className="animate-spin" />Testing...</>
        ) : (
          <><Zap size={13} />Test Koneksi</>
        )}
      </button>
    </>
  );

  const agent2Tools = (
    <>
      <SectionLabel>Analisis KPI</SectionLabel>
      <p className="text-xs text-slate-600 leading-relaxed">
        Upload CSV produksi harian. Agent 2 kalkulasi OEE, downtime, dan deviasi XGBoost.
      </p>
      {kpiLoading ? (
        <div className="flex items-center gap-2 text-sm text-blue-400 py-1">
          <Loader2 size={14} className="animate-spin" />
          <span>Menganalisis...</span>
        </div>
      ) : (
        <CSVUpload
          label="Upload CSV Produksi"
          description="production_daily.csv"
          onAnalyze={handleAnalyzeKPI}
          loading={kpiLoading}
        />
      )}
    </>
  );

  const agent3Tools = (
    <>
      <SectionLabel>Root Cause Analysis</SectionLabel>
      <p className="text-xs text-slate-600 leading-relaxed">
        Upload 3 CSV untuk analisis SHAP + narasi fishbone dari Groq LLM.
      </p>
      {/* 3-column horizontal pickers */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: 'productionLog', label: 'Prod. Log',   hint: 'production_log.csv' },
            { key: 'defectData',    label: 'Defect Data', hint: 'defect_data.csv' },
            { key: 'downtimeLog',   label: 'Downtime',    hint: 'downtime_log.csv' },
          ] as const
        ).map(({ key, label, hint }) => (
          <label
            key={key}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[#1e2d4a] bg-[#141c2e] hover:border-amber-500/40 cursor-pointer transition-colors p-2.5 text-center"
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setRcaFiles((prev) => ({ ...prev, [key]: f }));
                e.target.value = '';
              }}
            />
            {rcaFiles[key]
              ? <CheckCircle size={16} className="text-emerald-500" />
              : <GitBranch size={16} className="text-amber-500" />
            }
            <div className="text-xs font-medium text-slate-300 leading-tight">{label}</div>
            <div className="text-xs text-slate-600 truncate w-full" title={rcaFiles[key]?.name ?? hint}>
              {rcaFiles[key]?.name ?? hint}
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={handleAnalyzeRCA}
        disabled={!rcaReady || rcaLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {rcaLoading ? (
          <><Loader2 size={13} className="animate-spin" /> Menganalisis...</>
        ) : (
          <><BarChart3 size={13} /> Jalankan RCA</>
        )}
      </button>
    </>
  );

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0e1a] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {allOnline ? (
            <ShieldCheck size={20} className="text-emerald-400" />
          ) : (
            <ShieldAlert size={20} className="text-amber-400" />
          )}
          <div>
            <h1 className="text-base font-bold text-white">Agent Monitor</h1>
            <p className="text-xs text-slate-600">
              {onlineCount}/{AGENTS.length} agent aktif · Terakhir diperbarui: {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPolling((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              polling
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'border-[#1e2d4a] text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${polling ? 'bg-emerald-400 animate-dot-pulse' : 'bg-slate-600'}`} />
            {polling ? 'Auto-refresh aktif' : 'Auto-refresh mati'}
          </button>
          <button
            onClick={runHealthChecks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e2d4a] text-slate-500 hover:text-slate-300 hover:border-[#2d4275] text-xs transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#1e2d4a] bg-[#0f1629]">
        <div className="flex items-center gap-6 text-xs">
          {AGENTS.map((a) => {
            const h = health[a.id];
            const color =
              h.status === 'online' ? 'text-emerald-400'
              : h.status === 'offline' ? 'text-red-400'
              : h.status === 'checking' ? 'text-amber-400'
              : 'text-slate-600';
            return (
              <div key={a.id} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  h.status === 'online' ? 'bg-emerald-400'
                  : h.status === 'offline' ? 'bg-red-400'
                  : h.status === 'checking' ? 'bg-amber-400 animate-dot-pulse'
                  : 'bg-slate-600'
                }`} />
                <span className={color}>{a.name}</span>
                {h.latency && <span className="text-slate-700">{h.latency}ms</span>}
              </div>
            );
          })}
        </div>
        <div className="ml-auto text-xs text-slate-700">
          Poll setiap {allOnline ? '30' : '5'} detik
        </div>
      </div>

      {/* Agent cards — each with embedded tools */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <AgentCard {...AGENTS[0]} health={health.agent1 ?? DEFAULT_HEALTH}>
          {agent1Tools}
        </AgentCard>
        <AgentCard {...AGENTS[1]} health={health.agent2 ?? DEFAULT_HEALTH}>
          {agent2Tools}
        </AgentCard>
        <AgentCard {...AGENTS[2]} health={health.agent3 ?? DEFAULT_HEALTH}>
          {agent3Tools}
        </AgentCard>
      </div>

      {/* Activity log */}
      <LogStream logs={logs} />

      {/* KPI / RCA results modal */}
      <ResponseModal payload={modal} onClose={() => setModal(null)} />
    </div>
  );
}
