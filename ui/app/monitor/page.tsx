'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentHealth, LogEntry } from '@/lib/types';
import { checkHealth } from '@/lib/api';
import AgentCard from '@/components/monitor/AgentCard';
import PipelineFlow from '@/components/monitor/PipelineFlow';
import LogStream from '@/components/monitor/LogStream';
import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';

const AGENTS = [
  {
    id: 'agent1' as const,
    name: 'Orchestrator',
    role: 'Routing & RAG Engine',
    port: 5678,
    technology: 'n8n + Qdrant',
    models: 'nomic-embed-text, llama3.2:3b',
  },
  {
    id: 'agent2' as const,
    name: 'KPI Analyst',
    role: 'Production Decision Support',
    port: 8000,
    technology: 'FastAPI + XGBoost',
    models: 'llama3.2:3b (Ollama)',
  },
  {
    id: 'agent3' as const,
    name: 'RCA Analyst',
    role: 'Root Cause Analysis',
    port: 9000,
    technology: 'FastAPI + SHAP',
    models: 'llama3.1:8b (Ollama)',
  },
];

const DEFAULT_HEALTH: AgentHealth = {
  status: 'unknown',
  latency: null,
  lastCheck: null,
};

function formatLastUpdated(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function MonitorPage() {
  const [health, setHealth] = useState<Record<string, AgentHealth>>({
    agent1: DEFAULT_HEALTH,
    agent2: DEFAULT_HEALTH,
    agent3: DEFAULT_HEALTH,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runHealthChecks = useCallback(async () => {
    // Set checking
    setHealth((prev) => ({
      agent1: { ...prev.agent1, status: 'checking' },
      agent2: { ...prev.agent2, status: 'checking' },
      agent3: { ...prev.agent3, status: 'checking' },
    }));

    const results = await Promise.allSettled(
      AGENTS.map((a) => checkHealth(a.id))
    );

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

    // Merge with external activity logs from localStorage
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
      // Deduplicate by id
      const seen = new Set<string>();
      return combined.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
    });

    setLastUpdated(now);
  }, []);

  useEffect(() => {
    runHealthChecks();
  }, [runHealthChecks]);

  useEffect(() => {
    if (polling) {
      intervalRef.current = setInterval(runHealthChecks, 5000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [polling, runHealthChecks]);

  const onlineCount = Object.values(health).filter((h) => h.status === 'online').length;
  const allOnline = onlineCount === AGENTS.length;

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
            <p className="text-[11px] text-slate-600">
              {onlineCount}/{AGENTS.length} agent aktif · Terakhir diperbarui: {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Polling toggle */}
          <button
            onClick={() => setPolling((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
              polling
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'border-[#1e2d4a] text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${polling ? 'bg-emerald-400 animate-dot-pulse' : 'bg-slate-600'}`} />
            {polling ? 'Auto-refresh aktif' : 'Auto-refresh mati'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={runHealthChecks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e2d4a] text-slate-500 hover:text-slate-300 hover:border-[#2d4275] text-[11px] transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#1e2d4a] bg-[#0f1629]">
        <div className="flex items-center gap-6 text-[11px]">
          {AGENTS.map((a) => {
            const h = health[a.id];
            const color =
              h.status === 'online' ? 'text-emerald-400' : h.status === 'offline' ? 'text-red-400' : h.status === 'checking' ? 'text-amber-400' : 'text-slate-600';
            return (
              <div key={a.id} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${h.status === 'online' ? 'bg-emerald-400' : h.status === 'offline' ? 'bg-red-400' : h.status === 'checking' ? 'bg-amber-400 animate-dot-pulse' : 'bg-slate-600'}`} />
                <span className={color}>{a.name}</span>
                {h.latency && <span className="text-slate-700">{h.latency}ms</span>}
              </div>
            );
          })}
        </div>
        <div className="ml-auto text-[10px] text-slate-700">
          Poll setiap 5 detik
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-3 gap-4">
        {AGENTS.map((a) => (
          <AgentCard key={a.id} {...a} health={health[a.id] ?? DEFAULT_HEALTH} />
        ))}
      </div>

      {/* Pipeline */}
      <PipelineFlow
        agent1={health.agent1 ?? DEFAULT_HEALTH}
        agent2={health.agent2 ?? DEFAULT_HEALTH}
        agent3={health.agent3 ?? DEFAULT_HEALTH}
      />

      {/* Logs */}
      <LogStream logs={logs} />
    </div>
  );
}
