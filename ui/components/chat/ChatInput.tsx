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
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.focus();
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="shrink-0 px-5 py-4 bg-[#0a0e1a] border-t border-[#1e2d4a]">
      <div className="rounded-2xl overflow-hidden border border-[#1e2d4a] bg-[#141c2e] focus-within:border-blue-500/40 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.07)] transition-all duration-200">

        {/* Textarea */}
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder="Tanya tentang OEE, downtime, defect rate, atau minta analisis akar masalah..."
          rows={2}
          className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-600 resize-none outline-none px-4 pt-3.5 pb-2 leading-relaxed max-h-40 overflow-y-auto"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
        />

        {/* Footer: hint left · send button right */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <span className="text-xs text-slate-700 select-none">
            Enter kirim&nbsp;·&nbsp;Shift+Enter baris baru
          </span>
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-500/20"
          >
            {disabled
              ? <Loader2 size={13} className="text-white animate-spin" />
              : <Send size={13} className="text-white" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
