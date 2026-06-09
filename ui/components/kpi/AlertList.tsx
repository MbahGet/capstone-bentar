import { Alert } from '@/lib/types';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const LEVEL_CONFIG = {
  high: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    label: 'Kritis',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    label: 'Peringatan',
  },
  low: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    label: 'Info',
  },
};

export default function AlertList({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const cfg = LEVEL_CONFIG[alert.level];
        const Icon = cfg.icon;
        return (
          <div key={i} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${cfg.bg}`}>
            <Icon size={14} className={`${cfg.color} shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <div className={`text-xs font-medium uppercase tracking-wide ${cfg.color}`}>
                {cfg.label} · {alert.metric.toUpperCase()}
              </div>
              <div className="text-sm text-slate-300 mt-0.5 leading-snug">{alert.message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}