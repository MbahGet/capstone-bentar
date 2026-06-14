/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { X, Trash2, Maximize2 } from 'lucide-react';
import { AgentLogEntry } from '@/utils/AgentLogEntry';
import { AGENT_BADGE } from '@/utils/AgentBadge';
import { DetailPopupAgent } from './DetailPopupAgent';
import { KPIResult, RCAResult } from '@/lib/types';
import KPICard from '@/components/kpi/KPICard';
import AlertList from '@/components/kpi/AlertList';
import DeviationTable from '@/components/kpi/DeviationTable';
import RCAResultPanel from '@/components/rca/RCAResult';
import { MarkdownContent } from '@/components/chat/MarkdownContent';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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
function isKPI(d: unknown): d is KPIResult {
  return !!d && typeof d === 'object' && 'summary' in (d as object) &&
    typeof (d as KPIResult).summary?.avg_oee === 'number';
}
function isRCA(d: unknown): d is RCAResult {
  return !!d && typeof d === 'object' && Array.isArray((d as RCAResult).root_causes);
}

/* ─── Pretty entry card ──────────────────────────────────────────────────── */
function PrettyEntry({ e }: { e: AgentLogEntry }) {
  const badge = AGENT_BADGE[e.agent] ?? { label: e.agent, color: 'text-slate-400' };
  const EntryHeader = (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#141c2e] font-mono text-xs shrink-0">
      <span className={`font-bold ${badge.color}`}>{badge.label}</span>
      <span className="text-slate-400">{e.method}</span>
      <span className="text-slate-300 truncate flex-1">{e.endpoint}</span>
      <span className={`font-semibold ml-auto shrink-0 ${statusColor(e.statusCode, e.error)}`}>
        {e.statusCode ?? 'ERR'}
      </span>
      {e.latency !== null && <span className="text-slate-500 shrink-0">{e.latency}ms</span>}
      <span className="text-slate-600 shrink-0">{formatTime(e.timestamp)}</span>
    </div>
  );

  if (isKPI(e.detail)) {
    const r = e.detail;
    return (
      <div className="rounded-2xl border border-[#1e2d4a] bg-[#0a0e1a] overflow-hidden">
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

  if (isRCA(e.detail)) {
    return (
      <div className="rounded-2xl border border-[#1e2d4a] bg-[#0a0e1a] overflow-hidden">
        {EntryHeader}
        <div className="p-4"><RCAResultPanel result={e.detail} /></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e2d4a] bg-[#0f1629] overflow-hidden text-xs">
      {EntryHeader}
      <div className="px-4 py-3">
        {e.error ? (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="font-semibold text-red-400 mb-0.5">Error</p>
            <p className="text-red-300 font-mono leading-relaxed">{e.error}</p>
          </div>
        ) : (
          <p className="text-emerald-400/70">Request berhasil.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Pretty popup (single entry) ───────────────────────────────────────── */
function PrettyPopup({ entry, onClose }: { entry: AgentLogEntry; onClose: () => void }) {
  const badge = AGENT_BADGE[entry.agent] ?? { label: entry.agent, color: 'text-slate-400' };
  const title = isKPI(entry.detail) ? 'Hasil Analisis KPI'
    : isRCA(entry.detail)          ? 'Hasil Root Cause Analysis'
    : `${badge.label} ${entry.method} ${entry.endpoint}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-tab-fade"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0f1629] border border-[#1e2d4a] rounded-2xl shadow-2xl overflow-hidden animate-fade-slide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1e2d4a] bg-[#141c2e] shrink-0">
          <Maximize2 size={14} className="text-slate-400 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatTime(entry.timestamp)} · {entry.timestamp.toLocaleDateString('id-ID')} · klik di luar atau Esc untuk menutup
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <PrettyEntry e={entry} />
        </div>
      </div>
    </div>
  );
}

/* ─── Compact row with per-row actions ──────────────────────────────────── */
function CompactRow({
  e,
  onDelete,
  onExpand,
}: {
  e: AgentLogEntry;
  onDelete: () => void;
  onExpand: () => void;
}) {
  const badge   = AGENT_BADGE[e.agent] ?? { label: e.agent, color: 'text-slate-400' };
  const isError = !!e.error || !e.statusCode;

  return (
    <div
      onDoubleClick={onExpand}
      className="group flex items-center gap-2 px-3 py-1.5 border-b border-[#0f1629] hover:bg-[#0f1629] transition-colors cursor-pointer select-none font-mono text-xs"
      title="Double-click untuk pretty view"
    >
      <span className="text-slate-500 shrink-0 w-[52px]">{formatTime(e.timestamp)}</span>
      <span className={`shrink-0 font-bold ${badge.color}`}>{badge.label}</span>
      <span className="text-slate-400 shrink-0">{e.method}</span>
      <span className="text-slate-300 truncate flex-1">{e.endpoint}</span>

      {/* Status / latency — hidden on hover to make room for action icons */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0 group-hover:hidden">
        {e.statusCode !== null && (
          <span className={isError ? 'text-red-400' : 'text-emerald-400'}>{e.statusCode}</span>
        )}
        {e.error && !e.statusCode && <span className="text-red-500 font-bold">ERR</span>}
        {e.latency !== null && <span className="text-slate-400">{e.latency}ms</span>}
      </div>

      {/* Action icons — shown on hover */}
      <div className="ml-auto hidden group-hover:flex items-center gap-1 shrink-0">
        <button
          onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
          title="Hapus entri ini"
          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <Trash2 size={10} />
        </button>
        <button
          onClick={(ev) => { ev.stopPropagation(); onExpand(); }}
          title="Buka pretty view"
          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all"
        >
          <Maximize2 size={10} />
        </button>
      </div>
    </div>
  );
}

/* ─── Provider toggle ────────────────────────────────────────────────────── */
type Provider = 'groq' | 'ollama';
function ProviderToggle({ value, onChange }: { value: Provider; onChange: (v: Provider) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-0.5 shrink-0">
      {(['groq', 'ollama'] as Provider[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${
            value === p
              ? p === 'groq'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

/* ─── Tab config ─────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'agent1' as const, label: 'Consultant'  },
  { id: 'agent2' as const, label: 'KPI'         },
  { id: 'agent3' as const, label: 'RCA Analyst' },
];

/* ─── Main component ─────────────────────────────────────────────────────── */
interface Props {
  a1Logs: AgentLogEntry[];
  a2Logs: AgentLogEntry[];
  a3Logs: AgentLogEntry[];
  onDeleteEntry: (agent: 'agent1' | 'agent2' | 'agent3', id: string) => void;
  provider: Provider;
  onProviderChange: (p: Provider) => void;
  className?: string;
}

export function TabbedAgentLogPanel({
  a1Logs, a2Logs, a3Logs,
  onDeleteEntry,
  provider, onProviderChange,
  className = '',
}: Props) {
  const [activeTab, setActiveTab]   = useState<'agent1' | 'agent2' | 'agent3'>('agent1');
  const [popupEntry, setPopupEntry] = useState<AgentLogEntry | null>(null);

  const logsMap = { agent1: a1Logs, agent2: a2Logs, agent3: a3Logs };
  const activeEntries = logsMap[activeTab];

  return (
    <>
      <div className={`rounded-2xl bg-[#0a0e1a] border border-[#1e2d4a] overflow-hidden flex flex-col ${className}`}>

        {/* ── Tab bar ── */}
        <div className="flex items-center border-b border-[#1e2d4a] bg-[#0f1629] shrink-0 gap-2 pr-2">
          {/* Tabs */}
          <div className="flex flex-1 overflow-hidden">
            {TABS.map((tab) => {
              const badge    = AGENT_BADGE[tab.id];
              const count    = logsMap[tab.id].length;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? `border-current ${badge.color}`
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className={`font-bold font-mono ${isActive ? badge.color : ''}`}>{badge.label}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums ${
                      isActive ? 'bg-white/10 text-slate-200' : 'bg-white/5 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Provider toggle — far right of tab bar */}
          <ProviderToggle value={provider} onChange={onProviderChange} />
        </div>

        {/* ── Log rows ── */}
        <div className="flex-1 overflow-y-auto min-h-[72px]">
          {activeEntries.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-slate-500 text-xs">—</div>
          ) : (
            activeEntries.map((e) => (
              <CompactRow
                key={e.id}
                e={e}
                onDelete={() => onDeleteEntry(activeTab, e.id)}
                onExpand={() => setPopupEntry(e)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pretty popup (maximize / double-click) */}
      {popupEntry && (
        <PrettyPopup entry={popupEntry} onClose={() => setPopupEntry(null)} />
      )}
    </>
  );
}
