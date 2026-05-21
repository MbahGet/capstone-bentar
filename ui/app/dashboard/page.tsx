'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import { sendChat, writeActivityLog } from '@/lib/api';
import {
  saveChatSession,
  loadChatHistory,
  saveActiveChat,
  loadActiveChat,
  clearActiveChat,
  ChatSession,
  ActiveChat,
  HistoryMessage,
} from '@/lib/history';
import ChatWindow from '@/components/chat/ChatWindow';
import ResponseModal, { ModalPayload } from '@/components/chat/ResponseModal';
import HistorySidebar from '@/components/history/HistorySidebar';
import { CalendarDays, Archive, X } from 'lucide-react';

/* ─── Welcome message ────────────────────────────────────────────────────── */
const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Selamat datang di FactoryOps Copilot. Ajukan pertanyaan tentang OEE, downtime, defect rate, atau minta analisis akar masalah (RCA). Untuk upload dokumen dan menjalankan analisis, buka halaman Monitor.',
  timestamp: new Date(),
  agentsCalled: [],
};

/* ─── Helper: HistoryMessage → Message ──────────────────────────────────── */
function toMessage(hm: HistoryMessage, i: number): Message {
  return {
    id: `r-${i}-${hm.timestamp}`,
    role: hm.role as 'user' | 'assistant',
    content: hm.content,
    agentsCalled: hm.agentsCalled,
    sources: hm.sources,
    timestamp: new Date(hm.timestamp),
    isError: hm.isError,
  };
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [chatLoading, setChatLoading] = useState(false);
  const [modal, setModal] = useState<ModalPayload | null>(null);

  /* History sidebar */
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  /* Previous-day confirmation */
  const [pendingArchive, setPendingArchive] = useState<ActiveChat | null>(null);

  /* Session tracking — refs, no re-renders */
  const sessionId      = useRef(`hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const sessionStartAt = useRef(new Date().toISOString());
  const historyBuf     = useRef<HistoryMessage[]>([]);

  /* ── On mount: restore today's chat OR prompt to archive yesterday ── */
  useEffect(() => {
    setSessions(loadChatHistory());

    const active = loadActiveChat();
    if (!active) return;

    const today = new Date().toDateString();
    if (active.date === today) {
      /* Same day → restore session into chat window */
      sessionId.current      = active.sessionId;
      sessionStartAt.current = active.startedAt;
      historyBuf.current     = [...active.messages];

      const restored = active.messages.filter((m) => m.content).map(toMessage);
      if (restored.length > 0) {
        setMessages([WELCOME, ...restored]);
      }
    } else {
      /* Different day → ask user what to do */
      setPendingArchive(active);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Save current buffer as the "active chat" (today's work, not yet archived) */
  function flushActive() {
    saveActiveChat({
      date: new Date().toDateString(),
      sessionId: sessionId.current,
      startedAt: sessionStartAt.current,
      messages: historyBuf.current,
    });
  }

  /* ── Archive confirmation handlers ── */
  function handleArchive() {
    if (!pendingArchive) return;
    saveChatSession({
      id: pendingArchive.sessionId,
      startedAt: pendingArchive.startedAt,
      messages: pendingArchive.messages,
    });
    clearActiveChat();
    setSessions(loadChatHistory());
    setPendingArchive(null);
  }

  function handleDismissArchive() {
    clearActiveChat();
    setPendingArchive(null);
  }

  /* ── Chat ── */
  const handleSend = useCallback(async (content: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    const loadId = (Date.now() + 1).toString();
    const loadMsg: Message = { id: loadId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadMsg]);
    setChatLoading(true);

    historyBuf.current.push({ role: 'user', content, timestamp: userMsg.timestamp.toISOString() });

    try {
      const start = Date.now();
      const data  = await sendChat(content);
      const latency = Date.now() - start;
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/chat', statusCode: 200, latency });

      const assistantMsg: Message = {
        id: loadId,
        role: 'assistant',
        content: data.response ?? 'Tidak ada respons.',
        agentsCalled: data.agents_called ?? [],
        sources: data.sources ?? [],
        timestamp: new Date(),
        isLoading: false,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadId ? assistantMsg : m)));
      setModal({ type: 'chat', message: assistantMsg, query: content });

      historyBuf.current.push({
        role: 'assistant',
        content: assistantMsg.content,
        timestamp: assistantMsg.timestamp.toISOString(),
        agentsCalled: assistantMsg.agentsCalled,
        sources: assistantMsg.sources,
      });
    } catch {
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/chat', statusCode: null, latency: null, error: 'Connection failed' });
      const errMsg: Message = {
        id: loadId,
        role: 'assistant',
        content: 'Agent 1 tidak dapat dijangkau. Pastikan sistem sudah berjalan.',
        timestamp: new Date(),
        isLoading: false,
        isError: true,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadId ? errMsg : m)));
      historyBuf.current.push({
        role: 'assistant',
        content: errMsg.content,
        timestamp: errMsg.timestamp.toISOString(),
        isError: true,
      });
    } finally {
      setChatLoading(false);
      flushActive();   // persist as today's active chat (not history)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-64px)]">

      {/* ── LEFT: History sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-[#1e2d4a] bg-[#0f1629] overflow-hidden">

        {/* Confirmation banner — shown when there's a previous-day chat to archive */}
        {pendingArchive && (
          <div className="m-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 shrink-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CalendarDays size={13} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Percakapan kemarin</span>
              <button
                onClick={handleDismissArchive}
                className="ml-auto text-slate-600 hover:text-slate-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-2.5">
              {pendingArchive.messages.filter((m) => m.role === 'user').length} pertanyaan dari&nbsp;
              {new Date(pendingArchive.startedAt).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}.
              Simpan ke riwayat?
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={handleArchive}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors"
              >
                <Archive size={11} />
                Simpan
              </button>
              <button
                onClick={handleDismissArchive}
                className="flex-1 py-1.5 rounded-lg border border-[#1e2d4a] text-slate-500 text-xs hover:text-slate-400 transition-colors"
              >
                Abaikan
              </button>
            </div>
          </div>
        )}

        <HistorySidebar
          sessions={sessions}
          onSelect={(s) => setModal({ type: 'history', session: s })}
        />
      </aside>

      {/* ── CENTER: Chat ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          isLoading={chatLoading}
        />
      </div>

      {/* Modal */}
      <ResponseModal payload={modal} onClose={() => setModal(null)} />
    </div>
  );
}
