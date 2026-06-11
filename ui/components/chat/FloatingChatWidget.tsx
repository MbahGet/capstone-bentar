'use client';

import { useState } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { Message, AgentHealth } from '@/lib/types';
import { ChatSession } from '@/lib/history';
import ChatWindow from './ChatWindow';
import HistorySidebar from '@/components/history/HistorySidebar';

type Tab = 'chat' | 'history';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'chat',    label: 'Asisten', icon: '/icons/chat.svg'    },
  { id: 'history', label: 'Riwayat', icon: '/icons/history.svg' },
];

interface Props {
  isOpen:       boolean;
  onToggle:     () => void;
  sessions:     ChatSession[];
  messages:     Message[];
  agentHealth:  Record<string, AgentHealth>;
  isReadOnly:   boolean;
  archiveLabel: string;
  loading:      boolean;
  onSend:           (text: string, files?: File[]) => void;
  onSelectHistory:  (session: ChatSession) => void;
  onNewChat:        () => void;
  onReturnToLive:   () => void;
}

export default function FloatingChatWidget({
  isOpen, onToggle,
  sessions, messages, agentHealth,
  isReadOnly, archiveLabel, loading,
  onSend, onSelectHistory, onNewChat, onReturnToLive,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  function handleSelectHistory(session: ChatSession) {
    onSelectHistory(session);
    setActiveTab('chat');
  }

  function handleNewChat() {
    onNewChat();
    setActiveTab('chat');
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">

      {isOpen && (
        <div className="w-[min(100vw,420px)] h-[min(100vh,80vh)] max-h-[80vh] min-h-[400px] rounded-2xl border border-bd bg-bg-secondary/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-fade-slide">

          <div className="flex items-center justify-between px-4 py-3 bg-[#0b0f19] border-b border-bd shrink-0">

            <div className="flex items-center gap-1.5 bg-bg-card border border-bd rounded-lg p-0.5">
              {TABS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                    activeTab === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <img src={icon} className="w-[11px] h-[11px] invert opacity-80" alt={label} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-bg-card px-2.5 py-1 rounded-lg border border-bd">
              {(['agent1', 'agent2', 'agent3'] as const).map((key) => {
                const h = agentHealth[key];
                const num = key.replace('agent', '');
                const dot =
                  h.status === 'online'   ? 'bg-emerald-500 animate-pulse' :
                  h.status === 'checking' ? 'bg-amber-500' :
                  h.status === 'offline'  ? 'bg-rose-500' : 'bg-slate-500';
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1"
                    title={`Agent ${num}: ${h.status}${h.latency != null ? ` · ${h.latency}ms` : ''}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[9px] font-bold text-slate-400 font-mono">A{num}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {activeTab === 'chat' && isReadOnly && (
            <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
              <Clock size={12} className="text-amber-400 shrink-0" />
              <span className="text-[10px] text-amber-300 font-medium truncate">
                Arsip — {archiveLabel}
              </span>
              <button
                onClick={onReturnToLive}
                className="ml-auto flex items-center gap-1 text-[9px] text-slate-400 hover:text-white transition-colors shrink-0 bg-bg-card border border-bd px-2 py-0.5 rounded"
              >
                <ArrowLeft size={9} />
                Chat Baru
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0">
            {activeTab === 'chat' ? (
              <ChatWindow
                messages={messages}
                onSend={onSend}
                isLoading={loading}
                isReadOnly={isReadOnly}
              />
            ) : (
              <HistorySidebar
                sessions={sessions}
                onSelect={handleSelectHistory}
                onNewChat={handleNewChat}
              />
            )}
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-[0_8px_30px_rgba(59,130,246,0.3)] flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
        title={isOpen ? 'Tutup asisten' : 'Buka Asisten AI Copilot'}
      >
        <img
          src={isOpen ? '/icons/cross.svg' : '/icons/chat.svg'}
          className="w-5.5 h-5.5 invert"
          alt={isOpen ? 'Tutup' : 'Obrolan'}
        />
      </button>
    </div>
  );
}
