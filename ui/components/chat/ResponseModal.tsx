'use client';

import { useEffect, useCallback } from 'react';
import { X, Bot, BarChart3, GitBranch, FileText, History } from 'lucide-react';
import { Message, KPIResult, RCAResult } from '@/lib/types';
import { ChatSession, formatHistoryTimestamp } from '@/lib/history';
import KPICard from '@/components/kpi/KPICard';
import AlertList from '@/components/kpi/AlertList';
import DeviationTable from '@/components/kpi/DeviationTable';
import RCAResultPanel from '@/components/rca/RCAResult';
import { HistoryBubble } from './HistoryBubble';
import { AGENT_LABELS } from '@/utils/AgentLabels';
import { MarkdownContent } from './MarkdownContent';

export type ModalPayload =
  | { type: 'chat';    message: Message; query: string }
  | { type: 'kpi';     result: KPIResult }
  | { type: 'rca';     result: RCAResult }
  | { type: 'history'; session: ChatSession };

interface Props {
  payload: ModalPayload | null;
  onClose: () => void;
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

  /* Derive enriched header for chat messages that carry KPI/RCA data */
  const chatKPI = payload.type === 'chat' ? payload.message.kpiResult : undefined;
  const chatRCA = payload.type === 'chat' ? payload.message.rcaResult : undefined;

  const headerIcon =
    payload.type === 'chat' && chatKPI && chatRCA ? (
      <span className="flex items-center gap-1">
        <BarChart3 size={15} className="text-violet-400" />
        <GitBranch size={15} className="text-amber-400" />
      </span>
    ) : payload.type === 'chat' && chatKPI ? <BarChart3 size={18} className="text-violet-400" />
    : payload.type === 'chat' && chatRCA ? <GitBranch size={18} className="text-amber-400"  />
    : { chat: <Bot size={18} className="text-blue-400" />, kpi: <BarChart3 size={18} className="text-violet-400" />, rca: <GitBranch size={18} className="text-amber-400" />, history: <History size={18} className="text-blue-400" /> }[payload.type];

  const headerTitle =
    payload.type === 'chat' && chatKPI && chatRCA ? 'Analisis KPI + RCA'
    : payload.type === 'chat' && chatKPI ? 'Hasil Analisis KPI'
    : payload.type === 'chat' && chatRCA ? 'Hasil Root Cause Analysis'
    : { chat: 'Respons Konsultan AI', kpi: 'Hasil Analisis KPI', rca: 'Hasil Root Cause Analysis', history: 'Riwayat Percakapan' }[payload.type];

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
              {/* Query + summary — only shown when there's no structured result */}
              {!chatKPI && !chatRCA && (
                <>
                  <div className="rounded-xl bg-[#141c2e] border border-[#1e2d4a] px-4 py-3">
                    <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Pertanyaan</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{payload.query}</p>
                  </div>
                  <div className="rounded-xl bg-[#0a0e1a] border border-[#1e2d4a] px-4 py-4">
                    <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Ringkasan</div>
                    <MarkdownContent content={payload.message.content} />
                  </div>
                </>
              )}

              {/* KPI result panel */}
              {chatKPI && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Hasil KPI (Agent 2)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <KPICard label="OEE" value={chatKPI.summary.avg_oee.toFixed(1)} unit="%" target="≥80%"
                      status={chatKPI.summary.avg_oee >= 80 ? 'good' : chatKPI.summary.avg_oee >= 70 ? 'warning' : 'critical'} />
                    <KPICard label="Defect Rate" value={chatKPI.summary.avg_defect_rate.toFixed(1)} unit="%" target="≤3%"
                      status={chatKPI.summary.avg_defect_rate <= 3 ? 'good' : chatKPI.summary.avg_defect_rate <= 5 ? 'warning' : 'critical'} />
                    <KPICard label="Downtime Rate" value={chatKPI.summary.avg_downtime_rate.toFixed(1)} unit="%" target="≤15%"
                      status={chatKPI.summary.avg_downtime_rate <= 15 ? 'good' : chatKPI.summary.avg_downtime_rate <= 20 ? 'warning' : 'critical'} />
                    <KPICard label="Deviasi" value={chatKPI.model_metrics.deviation_count.toString()} unit="mesin"
                      status={chatKPI.model_metrics.deviation_count === 0 ? 'good' : 'warning'} />
                  </div>
                  <AlertList alerts={chatKPI.alerts} />
                  <DeviationTable deviations={chatKPI.top_deviations} />
                  {chatKPI.recommendation?.text && (
                    <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e] overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#1e2d4a] text-xs font-medium text-slate-400 uppercase tracking-wide">Rekomendasi AI</div>
                      <div className="px-4 py-3"><MarkdownContent content={chatKPI.recommendation.text} /></div>
                    </div>
                  )}
                </div>
              )}

              {/* RCA result panel */}
              {chatRCA && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Root Cause Analysis (Agent 3)</div>
                  <RCAResultPanel result={chatRCA} />
                </div>
              )}

              {/* Agent badges + sources */}
              {((payload.message.agentsCalled?.length ?? 0) > 0 || (payload.message.sources?.length ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {(payload.message.agentsCalled ?? []).map((a) => {
                    const info = AGENT_LABELS[a] ?? AGENT_LABELS['none'];
                    return (
                      <span key={a} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    );
                  })}
                  {(payload.message.sources ?? []).length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
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
                <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#1e2d4a] text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Rekomendasi AI
                  </div>
                  <div className="px-4 py-3">
                    <MarkdownContent content={payload.result.recommendation.text} />
                  </div>
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
              <div className="flex items-center gap-3 text-xs text-slate-400">
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