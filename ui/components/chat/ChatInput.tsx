'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Loader2, Paperclip, FileText, File, X } from 'lucide-react';

interface Props {
  onSend: (text: string, model: string, files?: File[]) => void;
  disabled: boolean;
  placeholder?: string;
}

const MODELS = [
  { value: 'groq',   label: 'Groq' },
  { value: 'ollama', label: 'Ollama' },
];

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FileText size={11} />;
  if (['csv', 'xlsx', 'xls'].includes(ext)) return <FileText size={11} />;
  return <File size={11} />;
}

export default function ChatInput({ onSend, disabled, placeholder = "Tanyakan sesuatu..." }: Props) {
  const [text, setText]   = useState('');
  const [model, setModel] = useState('groq');
  const [files, setFiles] = useState<File[]>([]);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = Array.from(incoming);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...next.filter((f) => !names.has(f.name))];
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSend() {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, model, files.length > 0 ? files : undefined);
    setText('');
    setFiles([]);
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.focus();
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !disabled && (text.trim().length > 0 || files.length > 0);

  return (
    <div className="w-full px-4 pb-6 pt-2">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col bg-[#141c2e]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 focus-within:border-blue-500/40 focus-within:shadow-blue-900/20 transition-all duration-200 overflow-hidden">

          {/* Attached file chips */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 max-w-[200px]"
                >
                  <span className="text-slate-400 shrink-0">{fileIcon(f.name)}</span>
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-slate-500 hover:text-red-400 transition-colors ml-0.5"
                    aria-label={`Hapus ${f.name}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 px-4 pt-3 pb-3">

            {/* Attach button */}
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              className="shrink-0 self-end mb-0.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Lampirkan file"
            >
              <Paperclip size={15} />
            </button>

            {/* Model picker */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={disabled}
              className="shrink-0 self-end mb-0.5 bg-transparent text-slate-400 text-xs px-1.5 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500/40 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value} className="bg-[#0f1629]">{m.label}</option>
              ))}
            </select>

            {/* Textarea */}
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              disabled={disabled}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto py-0.5"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
              }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="shrink-0 self-end w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-700/30"
            >
              {disabled
                ? <Loader2 size={13} className="text-white animate-spin" />
                : <ArrowUp size={14} className="text-white" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
