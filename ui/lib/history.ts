import { FileAttachment, KPIResult, RCAResult } from './types';

/* ─── Shared message shape ───────────────────────────────────────────────── */
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;        // ISO-8601
  agentsCalled?: string[];
  sources?: string[];
  isError?: boolean;
  attachments?: FileAttachment[];
  kpiResult?: KPIResult;
  rcaResult?: RCAResult;
}


/* ─── Archived sessions (past days, user confirmed) ─────────────────────── */
export interface ChatSession {
  id: string;
  startedAt: string;        // ISO-8601
  messages: HistoryMessage[];
}

const HISTORY_KEY = 'bentar_chat_history';
const MAX_SESSIONS = 50;
const MAX_MESSAGES = 100;

export function loadChatHistory(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as ChatSession[];
  } catch {
    return [];
  }
}

export function saveChatSession(session: ChatSession): void {
  try {
    const all = loadChatHistory().filter((s) => s.id !== session.id);
    const trimmed = { ...session, messages: session.messages.slice(-MAX_MESSAGES) };
    localStorage.setItem(HISTORY_KEY, JSON.stringify([trimmed, ...all].slice(0, MAX_SESSIONS)));
  } catch { /* localStorage unavailable */ }
}

export function clearChatHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

/* ─── Active chat (current day, lives in chat window) ───────────────────── */
export interface ActiveChat {
  /** toDateString() snapshot of the day this session belongs to */
  date: string;
  sessionId: string;
  startedAt: string;        // ISO-8601
  messages: HistoryMessage[];
}

const ACTIVE_KEY = 'bentar_active_chat';

export function loadActiveChat(): ActiveChat | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveChat) : null;
  } catch {
    return null;
  }
}

export function saveActiveChat(chat: ActiveChat): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({
      ...chat,
      messages: chat.messages.slice(-MAX_MESSAGES),
    }));
  } catch { /* ignore */ }
}

export function clearActiveChat(): void {
  try { localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}

/* ─── Timestamp formatter ────────────────────────────────────────────────── */
/** "DD/MM/YYYY - HH.MM.SS" (id-ID style) */
export function formatHistoryTimestamp(ts: Date | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return `${date} - ${time}`;
}
