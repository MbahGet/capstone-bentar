'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface Props {
  messages: Message[];
  onSend: (text: string, files?: File[]) => void;
  isLoading: boolean;
  isReadOnly?: boolean;
}

export default function ChatWindow({ messages, onSend, isLoading, isReadOnly }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#070a13]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} className="shrink-0 h-0" />
      </div>

      {/* Input Area */}
      <div className="w-full shrink-0 bg-transparent">
        <ChatInput onSend={onSend} disabled={isLoading} isReadOnly={isReadOnly} />
      </div>
    </div>
  );
}
