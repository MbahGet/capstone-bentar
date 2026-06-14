/* eslint-disable @next/next/no-img-element */
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
import HistorySidebar from '@/components/history/HistorySidebar';
import ResponseModal, { ModalPayload } from '@/components/chat/ResponseModal';

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Selamat datang di FactoryOps Copilot. Ajukan pertanyaan tentang OEE, downtime, defect rate, atau minta analisis akar masalah (RCA).',
  timestamp: new Date(),
  agentsCalled: [],
};

function toMessage(hm: HistoryMessage, i: number): Message {
  return {
    id: `r-${i}-${hm.timestamp}`,
    role: hm.role as 'user' | 'assistant',
    content: hm.content,
    agentsCalled: hm.agentsCalled,
    sources: hm.sources,
    timestamp: new Date(hm.timestamp),
    isError: hm.isError,
    kpiResult: hm.kpiResult,
    rcaResult: hm.rcaResult,
    attachedFiles: hm.attachedFiles,
  };
}

export default function DashboardPage() {
  const [messages, setMessages]               = useState<Message[]>([WELCOME]);
  const [chatLoading, setChatLoading]         = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessions, setSessions]               = useState<ChatSession[]>(() => loadChatHistory());
  const [sessionTick, setSessionTick]         = useState(0);
  const [chatModal, setChatModal]             = useState<ModalPayload | null>(null);

  // Lazy ref init — avoids calling impure functions directly during render
  const sessionId      = useRef<string>(null!);
  if (!sessionId.current) sessionId.current = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sessionStartAt = useRef<string>(null!);
  if (!sessionStartAt.current) sessionStartAt.current = new Date().toISOString();
  const historyBuf     = useRef<HistoryMessage[]>([]);

  /* Restore today's active chat on mount */
  useEffect(() => {
    const active = loadActiveChat();
    if (!active) return;

    const today = new Date().toDateString();
    if (active.date === today) {
      sessionId.current      = active.sessionId;
      sessionStartAt.current = active.startedAt;
      historyBuf.current     = [...active.messages];

      const restored = active.messages.filter((m) => m.content).map(toMessage);
      if (restored.length > 0) setMessages([WELCOME, ...restored]);
    } else {
      /* Auto-archive previous day */
      saveChatSession({
        id: active.sessionId,
        startedAt: active.startedAt,
        messages: active.messages,
      });
      clearActiveChat();
      setSessions(loadChatHistory());
    }
  }, []);

  function flushActive() {
    const snapshot: ActiveChat = {
      date: new Date().toDateString(),
      sessionId: sessionId.current,
      startedAt: sessionStartAt.current,
      messages: historyBuf.current,
    };
    saveActiveChat(snapshot);

    if (historyBuf.current.some((m) => m.role === 'user')) {
      saveChatSession({
        id: sessionId.current,
        startedAt: sessionStartAt.current,
        messages: historyBuf.current,
      });
      setSessions(loadChatHistory());
    }
  }

  function handleNewChat() {
    if (historyBuf.current.some((m) => m.role === 'user')) {
      saveChatSession({ id: sessionId.current, startedAt: sessionStartAt.current, messages: historyBuf.current });
    }
    clearActiveChat();
    sessionId.current      = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStartAt.current = new Date().toISOString();
    historyBuf.current     = [];
    setMessages([WELCOME]);
    setSessions(loadChatHistory());
    setSessionTick((t) => t + 1);
  }

  function handleSelectSession(session: ChatSession) {
    const loaded = session.messages.filter((m) => m.content).map(toMessage);
    setMessages(loaded.length > 0 ? [WELCOME, ...loaded] : [WELCOME]);

    sessionId.current      = session.id;
    sessionStartAt.current = session.startedAt;
    historyBuf.current     = [...session.messages];

    saveActiveChat({
      date: new Date().toDateString(),
      sessionId: session.id,
      startedAt: session.startedAt,
      messages: session.messages,
    });

    setSessions(loadChatHistory());
    setSessionTick((t) => t + 1);
  }

  const handleSend = useCallback(async (content: string, model: string, files?: File[]) => {
    const fileNames = files?.map((f) => f.name);
    const userMsg: Message  = { id: Date.now().toString(), role: 'user', content, timestamp: new Date(), attachedFiles: fileNames };
    const loadId            = (Date.now() + 1).toString();
    const loadMsg: Message  = { id: loadId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadMsg]);
    setChatLoading(true);
    historyBuf.current.push({ role: 'user', content, timestamp: userMsg.timestamp.toISOString(), attachedFiles: fileNames });

    try {
      const start   = Date.now();
      const data    = await sendChat(content, model, files);
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
        kpiResult: data.kpi_result,
        rcaResult: data.rca_result,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadId ? assistantMsg : m)));
      historyBuf.current.push({
        role: 'assistant',
        content: assistantMsg.content,
        timestamp: assistantMsg.timestamp.toISOString(),
        agentsCalled: assistantMsg.agentsCalled,
        sources: assistantMsg.sources,
        kpiResult: assistantMsg.kpiResult,
        rcaResult: assistantMsg.rcaResult,
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
      flushActive();
    }
  }, []);

  const isEmpty = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <div
      className="relative h-full overflow-hidden flex flex-row animate-tab-fade"
      style={{
        background:
          'radial-gradient(ellipse at 70% 20%, rgba(37,99,235,0.45) 0%, transparent 55%), radial-gradient(ellipse at 20% 85%, rgba(30,58,138,0.3) 0%, transparent 45%), #030712',
      }}
    >
      {/* Persistent history sidebar */}
      <aside
        className={`shrink-0 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          sidebarCollapsed ? 'w-12' : 'w-52'
        }`}
      >
        <HistorySidebar
          sessions={sessions}
          onSelect={handleSelectSession}
          onNewChat={handleNewChat}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </aside>

      {/* Main chat */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          isLoading={chatLoading}
          isEmpty={isEmpty}
          sessionKey={sessionTick}
          onMessageExpand={(msg, query) =>
            setChatModal({ type: 'chat', message: msg, query })
          }
        />
      </div>

      {/* Chat result popup */}
      <ResponseModal payload={chatModal} onClose={() => setChatModal(null)} />
    </div>
  );
}
