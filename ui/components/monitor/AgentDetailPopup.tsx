import { AgentLogEntry } from "@/utils/AgentLogEntry";
import { AGENT_BADGE } from "@/utils/AgentBadge";
import { X } from "lucide-react";

function fmtTime(d: Date) {
  return d.toLocaleTimeString('id-ID', { hour12: false }).replace(/:/g, '.');
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const LOG_COLS = ['Agent', 'Method', 'Endpoint', 'Status', 'Latency', 'Date', 'Time', 'Messages'] as const;

function dedupeByRoute(logs: AgentLogEntry[]): AgentLogEntry[] {
  const seen = new Set<string>();
  return logs.filter((l) => {
    const key = `${l.method}|${l.endpoint}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function AgentDetailPopup({
  agentId, logs, onClose,
}: {
  agentId: string;
  logs: AgentLogEntry[];
  onClose: () => void;
}) {
  const badge = AGENT_BADGE[agentId] ?? { label: `[${agentId}]`, color: 'text-slate-400' };
  const rows = dedupeByRoute(logs);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-tab-fade" />
      <div
        className="relative z-10 w-full max-w-3xl bg-[#0a0e1a] border border-[#1e2d4a] rounded-2xl shadow-2xl overflow-hidden animate-fade-slide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d4a] bg-[#0f1629]">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold ${badge.color}`}>{badge.label}</span>
            <span className="text-xs text-slate-400 uppercase tracking-widest">Activity Log</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={13} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-72">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-slate-500 font-mono">—</div>
          ) : (
            <table className="w-full text-xs font-mono border-collapse">
              <thead className="sticky top-0 bg-[#0a0e1a] z-10">
                <tr className="border-b border-[#1e2d4a]">
                  {LOG_COLS.map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => {
                  const isErr = !!log.error || !log.statusCode;
                  const msg = log.error ?? (log.detail !== undefined ? JSON.stringify(log.detail).slice(0, 80) : '—');
                  return (
                    <tr key={log.id} className="border-b border-[#0f1629] hover:bg-[#0f1629] transition-colors">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={badge.color}>{badge.label}</span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{log.method}</td>
                      <td className="px-3 py-1.5 text-slate-300 max-w-[140px] truncate">{log.endpoint}</td>
                      <td className={`px-3 py-1.5 whitespace-nowrap font-bold ${isErr ? 'text-red-400' : 'text-emerald-400'}`}>
                        {log.statusCode ?? 'ERR'}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">
                        {log.latency !== null ? `${log.latency}ms` : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{fmtDate(log.timestamp)}</td>
                      <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{fmtTime(log.timestamp)}</td>
                      <td className="px-3 py-1.5 text-slate-300 max-w-[180px] truncate" title={String(msg)}>
                        {msg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}