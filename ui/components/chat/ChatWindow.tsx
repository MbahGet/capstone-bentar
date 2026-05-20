'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Bot } from 'lucide-react';

interface Props {
  messages: Message[];
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatWindow({ messages, onSend, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-w-0 border-r border-[#1e2d4a]">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e2d4a] bg-[#0f1629] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <Bot size={18} className="text-blue-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Konsultan AI</div>
          <div className="text-[11px] text-slate-500">Agent 1 (Orchestrator) · Qdrant + Ollama</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-dot-pulse" />
          <span>Aktif</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
