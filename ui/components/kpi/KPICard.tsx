interface Props {
  label: string;
  value: string;
  unit?: string;
  target?: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

const STATUS_COLOR = {
  good: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  neutral: 'text-slate-300',
};

const STATUS_BG = {
  good: 'border-emerald-500/20 bg-emerald-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  critical: 'border-red-500/20 bg-red-500/5',
  neutral: 'border-[#1e2d4a] bg-[#141c2e]',
};

export default function KPICard({ label, value, unit, target, status }: Props) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${STATUS_BG[status]}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${STATUS_COLOR[status]}`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
      {target && (
        <div className="text-xs text-slate-600 mt-0.5">Target: {target}</div>
      )}
    </div>
  );
}
