import { AgentHealth } from '@/lib/types';
import { Cpu, Zap, Clock, ExternalLink } from 'lucide-react';

interface Props {
  id: 'agent1' | 'agent2' | 'agent3';
  name: string;
  role: string;
  port: number;
  technology: string;
  models?: string;
  health: AgentHealth;
}

const STATUS_MAP = {
  online: { dot: 'bg-emerald-400 animate-glow-green', text: 'text-emerald-400', label: 'ONLINE', ring: 'border-emerald-500/20' },
  offline: { dot: 'bg-red-400 animate-glow-red', text: 'text-red-400', label: 'OFFLINE', ring: 'border-red-500/20' },
  checking: { dot: 'bg-amber-400 animate-dot-pulse', text: 'text-amber-400', label: 'CHECKING', ring: 'border-amber-500/20' },
  unknown: { dot: 'bg-slate-500', text: 'text-slate-500', label: 'UNKNOWN', ring: 'border-[#1e2d4a]' },
};

function formatLatency(ms: number | null) {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(date: Date | null) {
  if (!date) return 'belum dicek';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return 'baru saja';
  if (diff < 60) return `${diff}d lalu`;
  return `${Math.floor(diff / 60)}m lalu`;
}

export default function AgentCard({ id, name, role, port, technology, models, health }: Props) {
  const s = STATUS_MAP[health.status];

  return (
    <div className={`rounded-2xl border bg-[#141c2e] p-5 flex flex-col gap-4 transition-all hover:bg-[#1a2540] ${s.ring}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{id.replace('agent', 'Agent ')}</div>
          <div className="text-base font-bold text-white">{name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{role}</div>
        </div>
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0f1629] border ${s.ring}`}>
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          <span className={`text-[10px] font-mono font-bold ${s.text}`}>{s.label}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-[#0f1629] rounded-lg px-3 py-2">
          <Zap size={12} className="text-blue-400" />
          <div>
            <div className="text-[10px] text-slate-600">Latensi</div>
            <div className="text-sm font-mono font-bold text-slate-200">{formatLatency(health.latency)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#0f1629] rounded-lg px-3 py-2">
          <Clock size={12} className="text-blue-400" />
          <div>
            <div className="text-[10px] text-slate-600">Terakhir cek</div>
            <div className="text-sm font-mono font-bold text-slate-200">{timeAgo(health.lastCheck)}</div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Port</span>
          <span className="font-mono text-slate-400">{port}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Stack</span>
          <span className="text-slate-400">{technology}</span>
        </div>
        {models && (
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Model</span>
            <span className="text-slate-400 truncate max-w-[140px] text-right">{models}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {health.error && (
        <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 font-mono">
          {health.error.slice(0, 80)}
        </div>
      )}

      {/* Docs link */}
      <a
        href={`http://localhost:${port}/docs`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors border border-[#1e2d4a] rounded-lg py-1.5"
      >
        <ExternalLink size={11} />
        Buka Docs
      </a>
    </div>
  );
}
