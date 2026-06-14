import { Deviation } from '@/lib/types';
import { TrendingDown } from 'lucide-react';

export default function DeviationTable({ deviations }: { deviations: Deviation[] }) {
  if (!deviations.length) return null;

  return (
    <div className="rounded-xl border border-[#1e2d4a] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e2d4a] bg-[#0f1629]">
        <TrendingDown size={13} className="text-red-400" />
        <span className="text-xs font-medium text-slate-400">Top Deviasi</span>
      </div>
      <div className="divide-y divide-[#1e2d4a]">
        {deviations.slice(0, 5).map((d, i) => (
          <div key={i} className="px-3 py-2.5 bg-[#141c2e] hover:bg-[#1a2540] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-300">{d.machine_id}</span>
                <span className="text-xs text-slate-400">{d.date}</span>
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