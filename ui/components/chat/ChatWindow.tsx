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
    <div className="flex flex-col h-full min-h-0">
      {/* Messages — grows, scrolls internally from top to bottom (newest at bottom) */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 flex flex-col gap-5">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {/* Anchor at bottom so new messages auto-scroll into view */}
        <div ref={bottomRef} className="shrink-0 h-0" />
      </div>

      {/* Input — pinned to bottom */}
      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
