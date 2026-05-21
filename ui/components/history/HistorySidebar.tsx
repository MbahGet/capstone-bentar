'use client';

import { ChatSession, formatHistoryTimestamp } from '@/lib/history';
import { History, MessageSquare, MessagesSquare } from 'lucide-react';

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
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1e2d4a] shrink-0">
        <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <History size={12} className="text-blue-400" />
        </div>
        <span className="text-sm font-semibold text-slate-200">Riwayat</span>
        {sessions.length > 0 && (
          <span className="ml-auto text-xs bg-[#1e2d4a] text-slate-400 tabular-nums px-2 py-0.5 rounded-full">
            {sessions.length}
          </span>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#141c2e] border border-[#1e2d4a] flex items-center justify-center">
              <MessagesSquare size={20} className="text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">Belum ada riwayat</p>
              <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                Mulai chat untuk menyimpan<br />percakapan di sini
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map(({ key, label, sessions: gs }) => (
              <div key={key}>
                {/* Date label */}
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-[#1e2d4a]" />
                </div>

                {gs.map((s) => {
                  const firstUser = s.messages.find((m) => m.role === 'user');
                  const preview = firstUser?.content ?? 'Sesi kosong';
                  const userCount = s.messages.filter((m) => m.role === 'user').length;

                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className="w-full text-left px-3 py-2.5 mx-1 rounded-xl hover:bg-[#141c2e] active:bg-[#1a2540] transition-all duration-150 group border border-transparent hover:border-[#1e2d4a]"
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-lg bg-[#1e2d4a] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 border border-transparent transition-all">
                          <MessageSquare size={10} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* First question preview */}
                          <p className="text-xs text-slate-500 group-hover:text-slate-200 transition-colors leading-snug line-clamp-2 font-medium">
                            {preview}
                          </p>
                          {/* Timestamp + count */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-slate-700 font-mono tabular-nums">
                              {formatHistoryTimestamp(s.startedAt)}
                            </span>
                            <span className="text-slate-800">·</span>
                            <span className="text-[10px] text-slate-700 bg-[#1a2540] px-1.5 py-0.5 rounded-full">
                              {userCount}Q
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
