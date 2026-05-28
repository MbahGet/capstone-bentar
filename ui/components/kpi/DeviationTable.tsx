import { Deviation } from '@/lib/types';

export default function DeviationTable({ deviations }: { deviations: Deviation[] }) {
  if (!deviations.length) return null;

  return (
    <div className="rounded-xl border border-[#1e2d4a] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2d4a] bg-[#0f1629]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">Top Deviasi</span>
        </div>
        <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-md font-mono uppercase font-bold tracking-wider">
          Anomaly Detection (ML)
        </span>
      </div>
      <div className="divide-y divide-bd">
        {deviations.slice(0, 5).map((d, i) => (
          <div key={i} className="px-3 py-2.5 bg-bg-card hover:bg-bg-hover transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-300">{d.machine_id}</span>
                <span className="text-xs text-slate-600">{d.date}</span>
              </div>
              <span className="text-xs font-medium text-red-400">
                {(d.deviation_probability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>OEE <b className="text-slate-300">{d.oee.toFixed(1)}%</b></span>
              <span>DT <b className="text-slate-300">{d.downtime_rate.toFixed(1)}%</b></span>
              <span>Defect <b className="text-slate-300">{d.defect_rate.toFixed(1)}%</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
