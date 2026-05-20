'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, ChevronRight } from 'lucide-react';

interface Props {
  label: string;
  description: string;
  onAnalyze: (file: File) => Promise<void>;
  loading: boolean;
}

export default function CSVUpload({ label, description, onAnalyze, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  async function handleFile(file: File) {
    setFileName(file.name);
    await onAnalyze(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => !loading && inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-3 w-full rounded-xl border border-[#1e2d4a] bg-[#141c2e] hover:border-blue-500/50 hover:bg-[#1a2540] transition-all px-3 py-2.5 text-left disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <FileSpreadsheet size={16} className="text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-300">{label}</div>
          <div className="text-[10px] text-slate-600 truncate">
            {fileName || description}
          </div>
        </div>
        {loading ? (
          <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-600 shrink-0" />
        )}
      </button>
    </div>
  );
}
