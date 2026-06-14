/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { AgentLogEntry } from '@/utils/AgentLogEntry';
import { AGENT_BADGE } from '@/utils/AgentBadge';
import { DetailPopupAgent } from './DetailPopupAgent';
import { Sparkles } from 'lucide-react';
import { KPIResult, RCAResult } from '@/lib/types';
import KPICard from '@/components/kpi/KPICard';
import AlertList from '@/components/kpi/AlertList';
import DeviationTable from '@/components/kpi/DeviationTable';
import RCAResultPanel from '@/components/rca/RCAResult';
import { MarkdownContent } from '@/components/chat/MarkdownContent';

interface Props {
  title?: string;
  entries: AgentLogEntry[];
  maxVisible?: number;
  className?: string;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).replace(/:/g, '.');
}

function statusColor(code: number | null, error?: string) {
  if (error || !code) return 'text-red-400';
  if (code >= 200 && code < 300) return 'text-emerald-400';
  if (code >= 400) return 'text-red-400';
  return 'text-amber-400';
}

/* ── Type guards ─────────────────────────────────────────────────────────── */
function isKPI(d: unknown): d is KPIResult {
  return !!d && typeof d === 'object' && 'summary' in (d as object) &&
    typeof (d as KPIResult).summary?.avg_oee === 'number';
}
function isRCA(d: unknown): d is RCAResult {
  return !!d && typeof d === 'object' && Array.isArray((d as RCAResult).root_causes);
}

/* ── Pretty entry: full result or simple status card ─────────────────────── */
function PrettyEntry({ e }: { e: AgentLogEntry }) {
  const badge = AGENT_BADGE[e.agent] ?? { label: e.agent, color: 'text-slate-400' };

  /* Shared entry header */
  const EntryHeader = (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#141c2e] font-mono text-xs shrink-0">
      <span className={`font-bold ${badge.color}`}>{badge.label}</span>
      <span className="text-slate-400">{e.method}</span>
      <span className="text-slate-300 truncate flex-1">{e.endpoint}</span>
      <span className={`font-semibold ml-auto shrink-0 ${statusColor(e.statusCode, e.error)}`}>
        {e.statusCode ?? 'ERR'}
      </span>
      {e.latency !== null && (
        <span className="text-slate-500 shrink-0">{e.latency}ms</span>
      )}
      <span className="text-slate-600 shrink-0">{formatTime(e.timestamp)}</span>
    </div>
  );

  /* ── KPI full result ── */
  if (isKPI(e.detail)) {
    const r = e.detail;
    return (
      <div className="mx-3 my-2 rounded-2xl border border-[#1e2d4a] bg-[#0a0e1a] overflow-hidden">
        {EntryHeader}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KPICard label="OEE" value={r.summary.avg_oee.toFixed(1)} unit="%" target="≥80%"
              status={r.summary.avg_oee >= 80 ? 'good' : r.summary.avg_oee >= 70 ? 'warning' : 'critical'} />
            <KPICard label="Defect Rate" value={r.summary.avg_defect_rate.toFixed(1)} unit="%" target="≤3%"
              status={r.summary.avg_defect_rate <= 3 ? 'good' : r.summary.avg_defect_rate <= 5 ? 'warning' : 'critical'} />
            <KPICard label="Downtime Rate" value={r.summary.avg_downtime_rate.toFixed(1)} unit="%" target="≤15%"
              status={r.summary.avg_downtime_rate <= 15 ? 'good' : r.summary.avg_downtime_rate <= 20 ? 'warning' : 'critical'} />
            <KPICard label="Deviasi" value={r.model_metrics.deviation_count.toString()} unit="mesin"
              status={r.model_metrics.deviation_count === 0 ? 'good' : 'warning'} />
          </div>
          <AlertList alerts={r.alerts} />
          <DeviationTable deviations={r.top_deviations} />
          {r.recommendation?.text && (
            <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#1e2d4a] text-xs font-medium text-slate-400 uppercase tracking-wide">
                Rekomendasi AI
              </div>
              <div className="px-4 py-3">
                <MarkdownContent content={r.recommendation.text} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── RCA full result ── */
  if (isRCA(e.detail)) {
    return (
      <div className="mx-3 my-2 rounded-2xl border border-[#1e2d4a] bg-[#0a0e1a] overflow-hidden">
        {EntryHeader}
        <div className="p-4">
          <RCAResultPanel result={e.detail} />
        </div>
      </div>
    );
  }

  /* ── Fallback: simple status card (health checks, errors, etc.) ── */
  return (
    <div className="mx-3 my-2 rounded-xl border border-[#1e2d4a] bg-[#0f1629] overflow-hidden text-xs">
      {EntryHeader}
      <div className="px-4 py-3 space-y-2">
        {e.error ? (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-xs font-semibold text-red-400 mb-0.5">Error</p>
            <p className="text-red-300 font-mono leading-relaxed">{e.error}</p>
          </div>
        ) : (
          <p className="text-emerald-400/70 text-xs">Request berhasil.</p>
        )}
      </div>
    </div>
  );
}

export default function AgentLogPanel({ title = 'Agent Logs', entries, maxVisible = 5, className = '' }: Props) {
  const [expanded, setExpanded]     = useState(false);
  const [pretty, setPretty]         = useState(false);
  const [selected, setSelected]     = useState<AgentLogEntry | null>(null);
  const [clickTimer, setClickTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const visible = entries.slice(0, expanded ? undefined : maxVisible);

  function handleClick(entry: AgentLogEntry) {
    /* Double-click: open detail popup; single click ignored (compact mode only) */
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
      setSelected(entry);
    } else {
      const t = setTimeout(() => setClickTimer(null), 280);
      setClickTimer(t);
    }
  }

  return (
    <>
      <div className={`rounded-2xl bg-[#0a0e1a] border border-[#1e2d4a] overflow-hidden flex flex-col ${className}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2d4a] bg-[#0f1629] shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>

          <div className="flex items-center gap-2">
            {/* Pretty mode toggle */}
            <button
              onClick={() => setPretty((v) => !v)}
              title={pretty ? 'Compact mode' : 'Pretty mode'}
              className={`transition-colors ${pretty ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
              aria-label="Toggle pretty mode"
            >
              <Sparkles size={12} />
            </button>

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-500 hover:text-slate-200 transition-colors"
              aria-label="Expand"
            >
              <img src="/icon/ic-maximize.svg" alt="" width={11} height={11} />
            </button>
          </div>
        </div>

        {/* Log body */}
        <div className="flex-1 overflow-y-auto text-xs min-h-[72px]">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-slate-500">—</div>
          ) : pretty ? (
            /* ── Pretty: full result or status card ── */
            <>
              {visible.map((e) => <PrettyEntry key={e.id} e={e} />)}
              {!expanded && entries.length > maxVisible && (
                <button
                  onClick={() => setExpanded(true)}
                  className="w-full text-center py-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  +{entries.length - maxVisible} more
                </button>
              )}
            </>
          ) : (
            /* ── Compact rows ── */
            <div className="font-mono">
              {visible.map((e) => {
                const badge   = AGENT_BADGE[e.agent] ?? { label: e.agent, color: 'text-slate-400' };
                const isError = !!e.error || !e.statusCode;
                return (
                  <div
                    key={e.id}
                    onDoubleClick={() => setSelected(e)}
                    onClick={() => handleClick(e)}
                    className="flex items-center gap-2 px-4 py-1.5 border-b border-[#0f1629] hover:bg-[#0f1629] transition-colors cursor-pointer select-none"
                    title="Double-click untuk detail"
                  >
                    <span className="text-slate-500 shrink-0 w-[52px]">{formatTime(e.timestamp)}</span>
                    <span className={`shrink-0 font-bold ${badge.color}`}>{badge.label}</span>
                    <span className="text-slate-400 shrink-0">{e.method}</span>
                    <span className="text-slate-300 truncate flex-1">{e.endpoint}</span>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {e.statusCode !== null && (
                        <span className={isError ? 'text-red-400' : 'text-emerald-400'}>
                          {e.statusCode}
                        </span>
                      )}
                      {e.error && !e.statusCode && (
                        <span className="text-red-500 font-bold">ERR</span>
                      )}
                      {e.latency !== null && (
                        <span className="text-slate-400">{e.latency}ms</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {!expanded && entries.length > maxVisible && (
                <button
                  onClick={() => setExpanded(true)}
                  className="w-full text-center py-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  +{entries.length - maxVisible} more
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Double-click detail modal (compact mode only) */}
      {selected && <DetailPopupAgent entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}