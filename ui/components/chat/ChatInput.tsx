'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    ref.current?.focus();
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="p-4 border-t border-[#1e2d4a] bg-[#0f1629]">
      <div className="flex items-end gap-3 bg-[#141c2e] border border-[#1e2d4a] rounded-xl px-4 py-3 focus-within:border-blue-600/60 transition-colors">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder="Tanya tentang OEE, downtime, defect rate, atau minta analisis akar masalah..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
          style={{ minHeight: '24px' }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 transition-all hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <Loader2 size={14} className="text-white animate-spin" />
          ) : (
            <Send size={14} className="text-white" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-slate-700 mt-2 text-center">
        Enter untuk kirim · Shift+Enter untuk baris baru
      </p>
    </div>
  );
}
