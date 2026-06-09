import { RCAResult } from '@/lib/types';

export default function RCAResultPanel({ result }: { result: RCAResult }) {
  const maxScore = result.root_causes[0]?.importance_score ?? 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Records', value: result.summary.total_records_analyzed.toLocaleString() },
          { label: 'Insiden Defect', value: result.summary.defect_incidents_detected.toLocaleString() },
          { label: 'Defect Rate', value: `${result.summary.defect_rate_percentage.toFixed(1)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-card border border-bd rounded-xl px-3 py-2 text-center">
            <div className="text-xs text-slate-600">{label}</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-bd overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-bd bg-bg-secondary">
          <div className="flex items-center gap-2">
            <img src="/icons/magnifying.svg" className="w-3.25 h-3.25 invert opacity-80" alt="Search" />
            <span className="text-xs font-semibold text-slate-200">Akar Penyebab Utama</span>
          </div>
          <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md font-mono uppercase font-bold tracking-wider">
            Explainable AI (SHAP)
          </span>
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
                <div className="h-1.5 bg-bd rounded-full overflow-hidden">
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

      {result.explanation && (
        <div className="rounded-2xl border border-violet-500/30 bg-linear-to-r from-violet-950/15 via-indigo-950/15 to-blue-950/15 p-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <img src="/icons/bot.svg" className="w-3.5 h-3.5 invert opacity-80" alt="Bot" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Narasi Analisis
              </span>
            </div>
            <span className="text-[9px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-md font-mono uppercase font-bold tracking-wider">
              LLM Reasoning
            </span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {result.explanation}
          </div>
        </div>
      )}
    </div>
  );
}