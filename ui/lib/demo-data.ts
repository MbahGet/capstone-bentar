import { KPIResult, RCAResult } from './types';

/**
 * Static mock data used by the "Simulasi Pipeline" demo scenario.
 */
export const DEMO_KPI: KPIResult = {
  summary: {
    avg_oee: 68.5,
    avg_downtime_rate: 18.3,
    avg_defect_rate: 4.2,
    total_downtime_min: 240,
    total_production_units: 10000,
    total_defect_units: 420,
  },
  alerts: [
    {
      metric: 'OEE',
      level: 'high',
      message: 'OEE Lini 2 turun di bawah target (68.5% < 80.0%) karena frekuensi breakdown tinggi.',
    },
    {
      metric: 'Defect Rate',
      level: 'medium',
      message: 'Defect rate meningkat di Lini 2 (4.2% > 3.0%).',
    },
  ],
  model_metrics: {
    deviation_count: 1,
    deviation_ratio: 0.2,
    max_deviation_probability: 0.94,
  },
  top_deviations: [
    {
      date: new Date().toLocaleDateString('id-ID'),
      machine_id: 'Line-2-Assembly',
      oee: 68.5,
      downtime_rate: 18.3,
      defect_rate: 4.2,
      deviation_probability: 0.94,
      deviation_flag: 1,
    },
  ],
  recommendation: {
    source: 'Agent 2 (KPI)',
    text: 'AI merekomendasikan pengecekan segera terhadap stasiun soldering hidrolik di Lini 2. Hubungan statistik kuat menunjukkan fluktuasi tekanan oli berkorelasi langsung dengan lonjakan defect rate komponen.',
  },
};

export const DEMO_RCA: RCAResult = {
  status: 'success',
  summary: {
    total_records_analyzed: 500,
    defect_incidents_detected: 21,
    defect_rate_percentage: 4.2,
  },
  root_causes: [
    { rank: 1, feature: 'hydraulic_pressure_psi', importance_score: 0.42 },
    { rank: 2, feature: 'nozzle_temperature_c',   importance_score: 0.28 },
    { rank: 3, feature: 'operator_experience_months', importance_score: 0.15 },
  ],
  explanation:
    'Analisis SHAP mengidentifikasi bahwa **hydraulic_pressure_psi** menyumbang kontribusi terbesar (42%) terhadap deviasi operasi. Terjadi penurunan tekanan hidrolik di bawah 80 PSI yang berulang, memicu malfungsi mekanis stasiun penempatan komponen.',
};