'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

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
    <div className="flex flex-col flex-1 min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
