'use client';

import { ChatSession, formatHistoryTimestamp } from '@/lib/history';

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

interface Props {
  sessions: ChatSession[];
  onSelect: (session: ChatSession) => void;
  onNewChat: () => void;
}

export default function HistorySidebar({ sessions, onSelect, onNewChat }: Props) {
  const groups = groupByDate(sessions);

  return (
    <div className="flex flex-col h-full min-h-0">

      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all duration-150"
      >
        <img src="/icons/plus.svg" className="w-3.5 h-3.5 invert" alt="New Chat" />
        Chat Baru
      </button>

      <div className="flex-1 overflow-y-auto min-h-0 py-2 bg-bg-primary">
        {sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
              <p className="text-xs font-medium text-slate-600">Belum ada riwayat</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map(({ key, label, sessions: gs }) => (
              <div key={key}>
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-bd" />
                </div>

                {gs.map((s) => {
                  const firstUser = s.messages.find((m) => m.role === 'user');
                  const preview = firstUser?.content ?? 'Sesi kosong';

                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className="w-full text-left px-3 py-2.5 mx-1 rounded-xl hover:bg-bg-card active:bg-bg-hover transition-all duration-150 group border border-transparent hover:border-bd"
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-lg bg-bd flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 border border-transparent transition-all">
                          <img src="/icons/chat.svg" className="w-2.5 h-2.5 invert opacity-60 group-hover:opacity-100 transition-all" alt="Chat" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 group-hover:text-slate-200 transition-colors leading-snug line-clamp-2 font-medium">
                            {preview}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-slate-700 font-mono tabular-nums">
                              {formatHistoryTimestamp(s.startedAt)}
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