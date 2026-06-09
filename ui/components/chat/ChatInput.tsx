'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2, Lock } from 'lucide-react';

interface AttachedFile {
  file: File;
  type: 'csv' | 'pdf';
}

interface Props {
  onSend: (text: string, files?: File[]) => void;
  disabled: boolean;
  isReadOnly?: boolean;
}

export default function ChatInput({ onSend, disabled, isReadOnly }: Props) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    const hasFiles = attachedFiles.length > 0;
    if ((!trimmed && !hasFiles) || disabled || isReadOnly) return;

    const files = attachedFiles.map((af) => af.file);
    onSend(trimmed || `${attachedFiles.map((f) => f.file.name).join(', ')}`, files.length > 0 ? files : undefined);
    setText('');
    setAttachedFiles([]);
    if (textRef.current) {
      textRef.current.style.height = '32px';
      textRef.current.focus();
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.toLowerCase();
      if (ext.endsWith('.csv')) {
        newFiles.push({ file: f, type: 'csv' });
      } else if (ext.endsWith('.pdf')) {
        newFiles.push({ file: f, type: 'pdf' });
      }
    }
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  if (isReadOnly) {
    return (
      <div className="shrink-0 p-3 bg-bg-primary border-t border-bd">
        <div className="rounded-xl border border-bd bg-[#0d1323] px-3 py-2 flex items-center gap-2 opacity-60 select-none">
          <Lock size={12} className="text-slate-600 shrink-0" />
          <span className="text-xs text-slate-600 italic">
            Sesi arsip — tidak dapat membalas
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 p-3 bg-bg-primary border-t border-bd">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachedFiles.map((af, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-bg-card border border-bd text-[10px]"
            >
              {af.type === 'csv' ? (
                <img src="/icons/blueprint.svg" className="w-[10px] h-[10px] invert opacity-80 shrink-0" alt="CSV" />
              ) : (
                <img src="/icons/pdf-document.svg" className="w-[10px] h-[10px] invert opacity-80 shrink-0" alt="PDF" />
              )}
              <span className="text-slate-300 max-w-25 truncate">{af.file.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="p-0.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
              >
                <img src="/icons/cross.svg" className="w-[8px] h-[8px] invert opacity-80" alt="Hapus" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 bg-bg-card border border-bd rounded-xl p-1.5 focus-within:border-blue-500/40 transition-all duration-200">

        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-bd disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          title="Attach CSV atau PDF"
        >
          <img src="/icons/plus.svg" className="w-[14px] h-[14px] invert opacity-80" alt="Attach" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={attachedFiles.length > 0
            ? 'Tambahkan catatan...'
            : 'Tanya/attach CSV...'}
          rows={1}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 resize-none outline-none py-2 px-1 leading-normal max-h-24 overflow-y-auto"
          style={{ height: '32px' }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = '32px';
            el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
          }}
        />

        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && attachedFiles.length === 0)}
          className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
        >
          {disabled ? (
            <Loader2 size={13} className="text-white animate-spin" />
          ) : (
            <Send size={13} className="text-white" />
          )}
        </button>
      </div>
    </div>
  );
}