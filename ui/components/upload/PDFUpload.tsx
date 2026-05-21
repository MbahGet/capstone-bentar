'use client';

import { useRef, useState, DragEvent } from 'react';
import { FileText, Upload, CheckCircle, XCircle, Loader2, WifiOff } from 'lucide-react';

interface Props {
  onUpload: (file: File) => Promise<void>;
}

type Status = 'idle' | 'uploading' | 'done' | 'format-error' | 'upload-error';

export default function PDFUpload({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState<Status>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleFile(file: File) {
    // Accept by extension OR MIME type (some systems report application/octet-stream)
    const byExt  = file.name.toLowerCase().endsWith('.pdf');
    const byMime = file.type === 'application/pdf' || file.type === 'application/octet-stream';

    if (!byExt && !byMime) {
      setErrorMsg('Hanya file .pdf yang diterima');
      setStatus('format-error');
      setTimeout(() => setStatus('idle'), 3500);
      return;
    }

    setFileName(file.name);
    setStatus('uploading');
    try {
      await onUpload(file);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload gagal';
      setErrorMsg(msg.includes('503') || msg.includes('reach') || msg.includes('Agent')
        ? 'Agent 1 tidak dapat dijangkau'
        : 'Upload gagal, coba lagi');
      setStatus('upload-error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const borderClass =
    dragging           ? 'border-blue-500 bg-blue-500/10' :
    status === 'idle'  ? 'border-[#1e2d4a] hover:border-blue-500/50 hover:bg-[#141c2e]' :
    status === 'done'  ? 'border-emerald-500/50 bg-emerald-500/5' :
    (status === 'format-error' || status === 'upload-error')
                       ? 'border-red-500/50 bg-red-500/5' :
                         'border-blue-500/50 bg-blue-500/5';  // uploading

  return (
    <div
      onClick={() => (status === 'idle' || status === 'done') && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${borderClass}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
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
          <span className="text-xs text-emerald-400 truncate max-w-full px-2">{fileName}</span>
          <span className="text-xs text-emerald-500/70">Berhasil diupload</span>
        </>
      )}

      {status === 'format-error' && (
        <>
          <XCircle size={18} className="text-red-400" />
          <span className="text-xs text-red-400">{errorMsg}</span>
        </>
      )}

      {status === 'upload-error' && (
        <>
          <WifiOff size={18} className="text-red-400" />
          <span className="text-xs text-red-400 font-medium">{errorMsg}</span>
          <span className="text-xs text-red-500/60">Klik untuk coba lagi</span>
        </>
      )}
    </div>
  );
}
