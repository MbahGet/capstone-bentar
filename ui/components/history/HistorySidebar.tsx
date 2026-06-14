'use client';

import { ChatSession } from '@/lib/history';
import { ChevronLeft, ChevronRight, MessageSquare, MessagesSquare, Plus } from 'lucide-react';

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
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function HistorySidebar({ sessions, onSelect, onNewChat, collapsed, onToggleCollapse }: Props) {
  const groups = groupByDate(sessions);

  return (
    <div className="flex flex-col h-full min-h-0 bg-black/50 backdrop-blur-xl border-r border-white/[0.06]">

      {/* Header row — stacks vertically when collapsed */}
      <div className={`flex shrink-0 pt-3 pb-2 ${collapsed ? 'flex-col items-center gap-2 px-2' : 'flex-row items-center gap-2 px-3'}`}>
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {!collapsed && (
          <span className="text-sm font-semibold text-slate-200 flex-1 truncate">Riwayat</span>
        )}

        <button
          onClick={onNewChat}
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Chat baru"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Session list — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-4 text-center">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <MessagesSquare size={16} className="text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Belum ada riwayat.<br />Mulai chat untuk menyimpan.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map(({ key, label, sessions: gs }) => (
                <div key={key}>
                  <div className="px-2 pt-3 pb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                      {label}
                    </span>
                  </div>

                  {gs.map((s, i) => {
                    const firstUser = s.messages.find((m) => m.role === 'user');
                    const preview = firstUser?.content ?? 'Sesi kosong';

                    return (
                      <button
                        key={s.id}
                        onClick={() => onSelect(s)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all duration-150 group animate-stagger-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600/20 border border-white/5 group-hover:border-blue-500/30 transition-all">
                            <MessageSquare size={9} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-snug line-clamp-2 font-medium">
                              {preview}
                            </p>
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
      )}
    </div>
  );
}
