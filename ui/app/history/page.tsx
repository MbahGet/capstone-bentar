'use client';

import { useState, useEffect } from 'react';
import {
  ChatSession,
  HistoryMessage,
  loadChatHistory,
  clearChatHistory,
  formatHistoryTimestamp,
} from '@/lib/history';
import {
  Bot,
  User,
  Clock,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  History,
  AlertCircle,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function dateSectionLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hari Ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function groupByDate(sessions: ChatSession[]): { label: string; key: string; sessions: ChatSession[] }[] {
  const map = new Map<string, { label: string; sessions: ChatSession[] }>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toDateString();
    if (!map.has(key)) map.set(key, { label: dateSectionLabel(s.startedAt), sessions: [] });
    map.get(key)!.sessions.push(s);
  }
  return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
}

const AGENT_COLOR: Record<string, string> = {
  agent1: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  agent2: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  agent3: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};
const AGENT_LABEL: Record<string, string> = {
  agent1: 'Orchestrator',
  agent2: 'KPI Analyst',
  agent3: 'RCA Analyst',
  none: 'Orchestrator',
};

/* ─── Single message row ─────────────────────────────────────────────────── */
function MessageRow({ msg }: { msg: HistoryMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 px-5 py-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
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

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Timestamp */}
        <span className="text-xs text-slate-600 font-mono">
          {formatHistoryTimestamp(msg.timestamp)}
        </span>

        {/* Content */}
        <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : msg.isError
            ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm'
            : 'bg-[#141c2e] border border-[#1e2d4a] text-slate-200 rounded-tl-sm'
        }`}>
          <p className="whitespace-pre-wrap line-clamp-8">{msg.content}</p>
        </div>

        {/* Agent badges */}
        {!isUser && (msg.agentsCalled?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.agentsCalled!.map((a) => (
              <span key={a} className={`text-xs px-2 py-0.5 rounded border font-medium ${AGENT_COLOR[a] ?? AGENT_COLOR['agent1']}`}>
                {AGENT_LABEL[a] ?? a}
              </span>
            ))}
            {(msg.sources?.length ?? 0) > 0 && (
              <span className="text-xs text-slate-600">{msg.sources!.length} dokumen</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Session card ───────────────────────────────────────────────────────── */
function SessionCard({ session }: { session: ChatSession }) {
  const [open, setOpen] = useState(false);

  const firstUser = session.messages.find((m) => m.role === 'user');
  const userCount = session.messages.filter((m) => m.role === 'user').length;
  const preview = firstUser?.content.slice(0, 90) ?? 'Sesi kosong';

  return (
    <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e] overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#1a2540] transition-colors text-left"
      >
        <MessageSquare size={14} className="text-blue-400 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 truncate">{preview}{firstUser && firstUser.content.length > 90 ? '…' : ''}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={11} className="text-slate-600" />
            <span className="text-xs text-slate-600 font-mono">
              {formatHistoryTimestamp(session.startedAt)}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-600">{userCount} pertanyaan · {session.messages.length} pesan</span>
          </div>
        </div>

        {open
          ? <ChevronDown size={14} className="text-slate-600 shrink-0" />
          : <ChevronRight size={14} className="text-slate-600 shrink-0" />
        }
      </button>

      {/* Messages */}
      {open && (
        <div className="border-t border-[#1e2d4a] bg-[#0a0e1a] divide-y divide-[#0f1629]">
          {session.messages.map((msg, i) => (
            <MessageRow key={i} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function HistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setSessions(loadChatHistory());
  }, []);

  const groups = groupByDate(sessions);

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearChatHistory();
    setSessions([]);
    setConfirmClear(false);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0e1a] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History size={20} className="text-blue-400" />
          <div>
            <h1 className="text-base font-bold text-white">Riwayat Chat</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {sessions.length} sesi tersimpan · Format waktu: DD/MM/YYYY - HH.MM.SS
            </p>
          </div>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleClear}
            onBlur={() => setConfirmClear(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              confirmClear
                ? 'border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'border-[#1e2d4a] text-slate-500 hover:text-red-400 hover:border-red-500/30'
            }`}
          >
            <Trash2 size={12} />
            {confirmClear ? 'Klik lagi untuk konfirmasi' : 'Hapus semua'}
          </button>
        )}
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#141c2e] border border-[#1e2d4a] flex items-center justify-center">
            <History size={28} className="text-slate-700" />
          </div>
          <div className="text-center">
            <p className="text-slate-500 text-sm font-medium">Belum ada riwayat chat</p>
            <p className="text-slate-700 text-xs mt-1">Mulai percakapan di halaman Dashboard</p>
          </div>
        </div>
      )}

      {/* Sessions grouped by date */}
      {groups.map(({ key, label, sessions: gs }) => (
        <section key={key} className="space-y-2">
          {/* Date divider */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">{label}</div>
            <div className="flex-1 border-t border-[#1e2d4a]" />
            <div className="text-xs text-slate-700">{gs.length} sesi</div>
          </div>

          {gs.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </section>
      ))}
    </div>
  );
}
