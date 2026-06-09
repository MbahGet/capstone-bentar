'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Play, X } from 'lucide-react';

interface Props {
  label: string;
  description: string;
  onAnalyze: (file: File) => Promise<void>;
  loading: boolean;
}

export default function CSVUpload({ label, description, onAnalyze, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handleSubmit() {
    if (!pendingFile || loading) return;
    await onAnalyze(pendingFile);
    setPendingFile(null);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => !loading && inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-3 w-full rounded-xl border border-bd bg-bg-card hover:border-blue-500/50 hover:bg-bg-hover transition-all px-3 py-2.5 text-left disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPendingFile(f);
            e.target.value = '';
          }}
        />
        <FileSpreadsheet size={16} className={pendingFile ? 'text-blue-400 shrink-0' : 'text-violet-400 shrink-0'} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-300">{label}</div>
          <div className={`text-xs truncate ${pendingFile ? 'text-blue-400' : 'text-slate-600'}`}>
            {pendingFile?.name ?? description}
          </div>
        </div>
        {pendingFile && !loading && (
          <button onClick={handleClear} className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0">
            <X size={12} />
          </button>
        )}
      </button>

      <button
        onClick={handleSubmit}
        disabled={!pendingFile || loading}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 text-sm font-medium hover:bg-violet-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 size={13} className="animate-spin" />Menganalisis...</>
        ) : (
          <><Play size={13} />Analisis KPI</>
        )}
      </button>
    </div>
  );
}