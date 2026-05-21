import { RCAResult } from '@/lib/types';
import { GitBranch, BarChart3 } from 'lucide-react';

export default function RCAResultPanel({ result }: { result: RCAResult }) {
  const maxScore = result.root_causes[0]?.importance_score ?? 1;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Records', value: result.summary.total_records_analyzed.toLocaleString() },
          { label: 'Insiden Defect', value: result.summary.defect_incidents_detected.toLocaleString() },
          { label: 'Defect Rate', value: `${result.summary.defect_rate_percentage.toFixed(1)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#141c2e] border border-[#1e2d4a] rounded-xl px-3 py-2 text-center">
            <div className="text-xs text-slate-600">{label}</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Root causes */}
      <div className="rounded-xl border border-[#1e2d4a] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e2d4a] bg-[#0f1629]">
          <BarChart3 size={13} className="text-amber-400" />
          <span className="text-xs font-medium text-slate-400">Akar Penyebab (SHAP)</span>
        </div>
        <div className="p-3 space-y-2">
          {result.root_causes.slice(0, 6).map((rc) => {
            const pct = (rc.importance_score / maxScore) * 100;
            return (
              <div key={rc.rank}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-mono">
                    #{rc.rank} {rc.feature.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-amber-400 tabular-nums">
                    {rc.importance_score.toFixed(3)}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1e2d4a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {result.explanation && (
        <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e2d4a]">
            <GitBranch size={13} className="text-violet-400" />
            <span className="text-xs font-medium text-slate-400">Narasi Analisis</span>
          </div>
          <div className="px-3 py-3 text-sm text-slate-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {result.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
