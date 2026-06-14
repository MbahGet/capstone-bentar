import { AgentLogEntry } from "@/utils/AgentLogEntry";
import { AGENT_BADGE } from "@/utils/AgentBadge";
import { X } from "lucide-react";

function statusColor(code: number | null, error?: string) {
  if (error || !code) return 'text-red-400';
  if (code >= 200 && code < 300) return 'text-emerald-400';
  if (code >= 400) return 'text-red-400';
  return 'text-amber-400';
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).replace(/:/g, '.');
}

export function DetailPopupAgent({ entry, onClose }: { entry: AgentLogEntry; onClose: () => void }) {
  const badge = AGENT_BADGE[entry.agent] ?? { label: entry.agent, color: 'text-slate-400' };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-tab-fade" />
      <div className="relative z-10 w-full max-w-lg flex flex-col bg-[#0a0e1a] border border-[#1e2d4a] rounded-2xl shadow-2xl animate-fade-slide overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2d4a] bg-[#0f1629]">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={badge.color}>{badge.label}</span>
            <span className="text-slate-500">{entry.method}</span>
            <span className="text-slate-300">{entry.endpoint}</span>
            <span className={statusColor(entry.statusCode, entry.error)}>
              {entry.statusCode ?? 'ERR'}
            </span>
            {entry.latency !== null && (
              <span className="text-slate-400">{entry.latency}ms</span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>{formatTime(entry.timestamp)}</span>
            <span>·</span>
            <span>{entry.timestamp.toLocaleDateString('id-ID')}</span>
          </div>

          {entry.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-red-400 mb-1">Error</p>
              <p className="text-xs text-red-300 font-mono leading-relaxed">{entry.error}</p>
            </div>
          )}

          {entry.detail !== undefined ? (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1.5">Response</p>
              <pre className="text-xs text-slate-400 bg-[#141c2e] border border-[#1e2d4a] rounded-lg p-3 overflow-x-auto font-mono leading-relaxed max-h-64">
                {JSON.stringify(entry.detail, null, 2)}
              </pre>
            </div>
          ) : !entry.error ? (
            <p className="text-xs text-slate-400">Tidak ada detail tambahan.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
