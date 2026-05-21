'use client';

import { useEffect, useCallback } from 'react';
import { X, Bot, BarChart3, GitBranch, FileText, History, User, AlertCircle } from 'lucide-react';
import { Message, KPIResult, RCAResult } from '@/lib/types';
import { ChatSession, formatHistoryTimestamp } from '@/lib/history';
import KPICard from '@/components/kpi/KPICard';
import AlertList from '@/components/kpi/AlertList';
import DeviationTable from '@/components/kpi/DeviationTable';
import RCAResultPanel from '@/components/rca/RCAResult';

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  agent2: { label: 'KPI Analyst',  color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  agent3: { label: 'RCA Analyst',  color: 'text-amber-400  bg-amber-500/10  border-amber-500/30'  },
  none:   { label: 'Orchestrator', color: 'text-blue-400   bg-blue-500/10   border-blue-500/30'   },
};

export type ModalPayload =
  | { type: 'chat';    message: Message; query: string }
  | { type: 'kpi';     result: KPIResult }
  | { type: 'rca';     result: RCAResult }
  | { type: 'history'; session: ChatSession };

interface Props {
  payload: ModalPayload | null;
  onClose: () => void;
}

/* ─── History message bubble ─────────────────────────────────────────────── */
function HistoryBubble({ msg }: { msg: ChatSession['messages'][number] }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
        isUser
          ? 'bg-blue-600/20 border-blue-500/30'
          : msg.isError
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-slate-700/40 border-slate-600/20'
      }`}>
        {isUser
          ? <User size={12} className="text-blue-400" />
          : msg.isError
          ? <AlertCircle size={12} className="text-red-400" />
          : <Bot size={12} className="text-slate-400" />
        }
      </div>
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="text-xs text-slate-600 font-mono">{formatHistoryTimestamp(msg.timestamp)}</span>
        <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : msg.isError
            ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm'
            : 'bg-[#0a0e1a] border border-[#1e2d4a] text-slate-200 rounded-tl-sm'
        }`}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        {!isUser && (msg.agentsCalled?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.agentsCalled!.map((a) => {
              const info = AGENT_LABELS[a] ?? AGENT_LABELS['none'];
              return (
                <span key={a} className={`text-xs px-2 py-0.5 rounded border font-medium ${info.color}`}>
                  {info.label}
                </span>
              );
            })}
            {(msg.sources?.length ?? 0) > 0 && (
              <span className="text-xs text-slate-600">{msg.sources!.length} dokumen</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
export default function ResponseModal({ payload, onClose }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!payload) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [payload, handleKey]);

  if (!payload) return null;

  /* Header meta */
  const headerIcon = {
    chat:    <Bot     size={18} className="text-blue-400"   />,
    kpi:     <BarChart3 size={18} className="text-violet-400" />,
    rca:     <GitBranch size={18} className="text-amber-400"  />,
    history: <History size={18} className="text-blue-400"   />,
  }[payload.type];

  const headerTitle = {
    chat:    'Respons Konsultan AI',
    kpi:     'Hasil Analisis KPI',
    rca:     'Hasil Root Cause Analysis',
    history: 'Riwayat Percakapan',
  }[payload.type];

  const headerSub =
    payload.type === 'chat'    ? payload.message.timestamp.toLocaleString('id-ID') :
    payload.type === 'history' ? formatHistoryTimestamp(payload.session.startedAt) :
    'Klik di luar atau tekan Esc untuk menutup';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-slide"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[#1e2d4a] bg-[#0f1629] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e2d4a] shrink-0 bg-[#141c2e]">
          {headerIcon}
          <div>
            <h2 className="text-base font-semibold text-white">{headerTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{headerSub}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg hover:bg-[#1a2540] text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── CHAT ── */}
          {payload.type === 'chat' && (
            <>
              <div className="rounded-xl bg-[#141c2e] border border-[#1e2d4a] px-4 py-3">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Pertanyaan</div>
                <p className="text-sm text-slate-300 leading-relaxed">{payload.query}</p>
              </div>
              <div className="rounded-xl bg-[#0a0e1a] border border-[#1e2d4a] px-4 py-4">
                <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Respons</div>
                <p className="text-base text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {payload.message.content}
                </p>
              </div>
              {((payload.message.agentsCalled?.length ?? 0) > 0 || (payload.message.sources?.length ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {(payload.message.agentsCalled ?? []).map((a) => {
                    const info = AGENT_LABELS[a] ?? AGENT_LABELS['none'];
                    return (
                      <span key={a} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    );
                  })}
                  {(payload.message.sources ?? []).length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FileText size={12} />
                      {payload.message.sources!.length} dokumen direferensikan
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── KPI ── */}
          {payload.type === 'kpi' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <KPICard label="OEE" value={payload.result.summary.avg_oee.toFixed(1)} unit="%" target="≥80%"
                  status={payload.result.summary.avg_oee >= 80 ? 'good' : payload.result.summary.avg_oee >= 70 ? 'warning' : 'critical'} />
                <KPICard label="Defect Rate" value={payload.result.summary.avg_defect_rate.toFixed(1)} unit="%" target="≤3%"
                  status={payload.result.summary.avg_defect_rate <= 3 ? 'good' : payload.result.summary.avg_defect_rate <= 5 ? 'warning' : 'critical'} />
                <KPICard label="Downtime Rate" value={payload.result.summary.avg_downtime_rate.toFixed(1)} unit="%" target="≤15%"
                  status={payload.result.summary.avg_downtime_rate <= 15 ? 'good' : payload.result.summary.avg_downtime_rate <= 20 ? 'warning' : 'critical'} />
                <KPICard label="Deviasi" value={payload.result.model_metrics.deviation_count.toString()} unit="mesin"
                  status={payload.result.model_metrics.deviation_count === 0 ? 'good' : 'warning'} />
              </div>
              <AlertList alerts={payload.result.alerts} />
              <DeviationTable deviations={payload.result.top_deviations} />
              {payload.result.recommendation?.text && (
                <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e]">
                  <div className="px-4 py-2.5 border-b border-[#1e2d4a] text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Rekomendasi AI
                  </div>
                  <p className="px-4 py-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {payload.result.recommendation.text}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── RCA ── */}
          {payload.type === 'rca' && <RCAResultPanel result={payload.result} />}

          {/* ── HISTORY ── */}
          {payload.type === 'history' && (
            <>
              {/* Session meta */}
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>{payload.session.messages.filter((m) => m.role === 'user').length} pertanyaan</span>
                <span>·</span>
                <span>{payload.session.messages.length} pesan total</span>
              </div>

              {/* Message bubbles */}
              <div className="space-y-4">
                {payload.session.messages.map((msg, i) => (
                  <HistoryBubble key={i} msg={msg} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
