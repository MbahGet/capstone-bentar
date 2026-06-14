interface DropZoneProps {
  label: string;
  accept: string;
  icon: React.ReactNode;
  file: File | null;
  onFile: (f: File) => void;
}

export function DropZone({ label, accept, icon, file, onFile }: DropZoneProps) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#1e2d4a] bg-[#0f1629] hover:border-blue-500/40 hover:bg-[#141c2e] transition-all cursor-pointer px-4 py-5 flex-1 min-w-0">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
      <div className={`text-slate-400 transition-colors ${file ? 'text-blue-400' : ''}`}>{icon}</div>
      <span className="text-xs text-slate-400 text-center leading-snug">
        {file ? file.name : label}
      </span>
    </label>
  );
}