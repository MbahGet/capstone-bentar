'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface Props {
  messages: Message[];
  onSend: (text: string, model: string, files?: File[]) => void;
  isLoading: boolean;
  isEmpty: boolean;
  sessionKey: string | number;
  onMessageExpand?: (message: Message, query: string) => void;
}

export default function ChatWindow({ messages, onSend, isLoading, isEmpty, sessionKey, onMessageExpand }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Messages area — or empty state */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          <div key="empty" className="flex items-center justify-center h-full pt-14 animate-tab-fade">
            <h1 className="text-2xl font-bold text-white tracking-tight select-none">FactoryOps</h1>
          </div>
        ) : (
          <div key={sessionKey} className="pt-16 pb-6 flex flex-col gap-4 max-w-3xl mx-auto w-full animate-session-reset">
            {messages.filter((m) => m.id !== 'welcome').map((msg, i, arr) => {
              const query =
                msg.role === 'assistant' && !msg.isLoading
                  ? arr.slice(0, i).reverse().find((m) => m.role === 'user')?.content ?? ''
                  : '';

              const hasData = !!(msg.kpiResult || msg.rcaResult);

              return (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onExpand={
                    onMessageExpand && msg.role === 'assistant' && !msg.isLoading && !msg.isError && hasData
                      ? () => onMessageExpand(msg, query)
                      : undefined
                  }
                />
              );
            })}
            <div ref={bottomRef} className="shrink-0 h-0" />
          </div>
        )}
      </div>

      {/* Input — always at bottom */}
      <ChatInput onSend={(text, model, files) => onSend(text, model, files)} disabled={isLoading} />
    </div>
  );
}
