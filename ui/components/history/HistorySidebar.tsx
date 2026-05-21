'use client';

import { ChatSession, formatHistoryTimestamp } from '@/lib/history';
import { History, MessageSquare } from 'lucide-react';

/* ─── Group sessions by calendar day ────────────────────────────────────── */
function dateSectionLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hari Ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function groupByDate(sessions: ChatSession[]): { key: string; label: string; sessions: ChatSession[] }[] {
  const map = new Map<string, { label: string; sessions: ChatSession[] }>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toDateString();
    if (!map.has(key)) map.set(key, { label: dateSectionLabel(s.startedAt), sessions: [] });
    map.get(key)!.sessions.push(s);
  }
  return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  sessions: ChatSession[];
  onSelect: (session: ChatSession) => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function HistorySidebar({ sessions, onSelect }: Props) {
  const groups = groupByDate(sessions);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#1e2d4a] shrink-0">
        <History size={14} className="text-blue-400" />
        <span className="text-sm font-semibold text-slate-300">Riwayat</span>
        {sessions.length > 0 && (
          <span className="ml-auto text-xs text-slate-600 tabular-nums">{sessions.length}</span>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 px-4 text-center">
            <MessageSquare size={22} className="text-slate-700" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Belum ada riwayat.<br />Mulai chat untuk menyimpan.
            </p>
          </div>
        ) : (
          groups.map(({ key, label, sessions: gs }) => (
            <div key={key}>
              {/* Date label */}
              <div className="px-4 pt-3 pb-1 text-xs font-medium text-slate-600 uppercase tracking-widest">
                {label}
              </div>

              {gs.map((s) => {
                const firstUser = s.messages.find((m) => m.role === 'user');
                const preview = firstUser?.content ?? 'Sesi kosong';
                const userCount = s.messages.filter((m) => m.role === 'user').length;

                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#141c2e] active:bg-[#1a2540] transition-colors group border-b border-[#1e2d4a]/40 last:border-0"
                  >
                    {/* First question preview */}
                    <p className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-snug line-clamp-2">
                      {preview}
                    </p>
                    {/* Timestamp + count */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-slate-700 font-mono tabular-nums">
                        {formatHistoryTimestamp(s.startedAt)}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-700">{userCount}Q</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
