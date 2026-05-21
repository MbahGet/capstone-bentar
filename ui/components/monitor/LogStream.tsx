'use client';

import { useState } from 'react';
import { LogEntry } from '@/lib/types';
import { Terminal } from 'lucide-react';

const AGENT_COLOR: Record<string, string> = {
  agent1: 'text-blue-400',
  agent2: 'text-violet-400',
  agent3: 'text-amber-400',
};

const AGENT_LABEL: Record<string, string> = {
  agent1: 'A1',
  agent2: 'A2',
  agent3: 'A3',
};

type Filter = 'all' | 'agent1' | 'agent2' | 'agent3';

function formatTime(d: Date) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LogStream({ logs }: { logs: LogEntry[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.agent === filter);

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'agent1', label: 'Agent 1' },
    { key: 'agent2', label: 'Agent 2' },
    { key: 'agent3', label: 'Agent 3' },
  ];

  return (
    <div className="rounded-2xl border border-[#1e2d4a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2d4a] bg-[#0f1629]">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-500" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Activity Log</span>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === t.key
                  ? 'bg-[#1e2d4a] text-slate-200'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-[#0a0e1a] font-mono text-xs h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-700">
            Belum ada aktivitas
          </div>
        ) : (
          filtered.map((entry) => {
            const isError = !entry.statusCode || entry.statusCode >= 400;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-5 py-1.5 border-b border-[#0f1629] hover:bg-[#0f1629] transition-colors"
              >
                <span className="text-slate-700 shrink-0">{formatTime(entry.timestamp)}</span>
                <span className={`shrink-0 font-bold ${AGENT_COLOR[entry.agent]}`}>
                  [{AGENT_LABEL[entry.agent]}]
                </span>
                <span className="text-slate-500 shrink-0">{entry.method}</span>
                <span className="text-slate-400 truncate">{entry.endpoint}</span>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {entry.statusCode && (
                    <span className={isError ? 'text-red-400' : 'text-emerald-400'}>
                      {entry.statusCode}
                    </span>
                  )}
                  {entry.error && (
                    <span className="text-red-500 truncate max-w-[120px]">{entry.error}</span>
                  )}
                  {entry.latency !== null && (
                    <span className="text-slate-600">{entry.latency}ms</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
