'use client';

import { useRef, useState, DragEvent } from 'react';
import { FileText, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props {
  onUpload: (file: File) => Promise<void>;
}

export default function PDFUpload({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [fileName, setFileName] = useState('');

  async function handleFile(file: File) {
    if (!file.name.endsWith('.pdf')) {
      setStatus('error');
      return;
    }
    setFileName(file.name);
    setStatus('uploading');
    try {
      await onUpload(file);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onClick={() => status === 'idle' && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
        dragging
          ? 'border-blue-500 bg-blue-500/10'
          : status === 'idle'
          ? 'border-[#1e2d4a] hover:border-blue-500/50 hover:bg-[#141c2e]'
          : status === 'done'
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : status === 'error'
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-blue-500/50 bg-blue-500/5'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {status === 'idle' && (
        <>
          <Upload size={18} className="text-slate-500" />
          <span className="text-xs text-slate-500">Seret PDF atau klik untuk upload</span>
        </>
      )}
      {status === 'uploading' && (
        <>
          <Loader2 size={18} className="text-blue-400 animate-spin" />
          <span className="text-xs text-blue-400 truncate max-w-full px-2">{fileName}</span>
        </>
      )}
      {status === 'done' && (
        <>
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">Berhasil diupload</span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={18} className="text-red-400" />
          <span className="text-xs text-red-400">Upload gagal · Hanya PDF</span>
        </>
      )}
    </div>
  );
}
