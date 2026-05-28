'use client';

import React from 'react';
import { KPIResult, RCAResult } from '@/lib/types';
import KPICard from '@/components/kpi/KPICard';
import AlertList from '@/components/kpi/AlertList';
import DeviationTable from '@/components/kpi/DeviationTable';
import RCAResultPanel from '@/components/rca/RCAResult';
import { LayoutDashboard, Activity, Zap, Cpu } from 'lucide-react';

interface Props {
  kpiResult?: KPIResult;
  rcaResult?: RCAResult;
  onSimulateDemo: () => void;
  onSendPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export default function DashboardPanel({ kpiResult, rcaResult, onSimulateDemo, onSendPrompt, isLoading }: Props) {
  const hasData = !!kpiResult || !!rcaResult;

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] border-l border-bd overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {hasData ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* KPI Section */}
            {kpiResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-violet-500" />
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                    Hasil Analisis KPI (Agent 2)
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KPICard
                    label="OEE Rata-rata"
                    value={kpiResult.summary.avg_oee.toFixed(1)}
                    unit="%"
                    target="≥80%"
                    status={kpiResult.summary.avg_oee >= 80 ? 'good' : kpiResult.summary.avg_oee >= 70 ? 'warning' : 'critical'}
                  />
                  <KPICard
                    label="Defect Rate"
                    value={kpiResult.summary.avg_defect_rate.toFixed(1)}
                    unit="%"
                    target="≤3%"
                    status={kpiResult.summary.avg_defect_rate <= 3 ? 'good' : kpiResult.summary.avg_defect_rate <= 5 ? 'warning' : 'critical'}
                  />
                  <KPICard
                    label="Downtime Rate"
                    value={kpiResult.summary.avg_downtime_rate.toFixed(1)}
                    unit="%"
                    target="≤15%"
                    status={kpiResult.summary.avg_downtime_rate <= 15 ? 'good' : kpiResult.summary.avg_downtime_rate <= 20 ? 'warning' : 'critical'}
                  />
                  <KPICard
                    label="Mesin Deviasi"
                    value={kpiResult.model_metrics.deviation_count.toString()}
                    unit="mesin"
                    status={kpiResult.model_metrics.deviation_count === 0 ? 'good' : 'warning'}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alerts Terdeteksi</div>
                    <AlertList alerts={kpiResult.alerts} />
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tabel Deviasi Operasi</div>
                    <DeviationTable deviations={kpiResult.top_deviations} />
                  </div>
                </div>

                {kpiResult.recommendation?.text && (
                  <div className="rounded-2xl border border-violet-500/30 bg-linear-to-r from-violet-950/15 via-indigo-950/15 to-blue-950/15 p-4 shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <img src="/icons/bot.svg" className="w-[14px] h-[14px] invert opacity-80" alt="Bot" />
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Rekomendasi Solusi AI (Generative RAG)
                        </span>
                      </div>
                      <span className="text-[9px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-md font-mono uppercase font-bold tracking-wider">
                        Agent 1 + 2 Collaboration
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {kpiResult.recommendation.text}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* RCA Section */}
            {rcaResult && (
              <div className="space-y-4 border-t border-bd pt-6">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-amber-500" />
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                    Root Cause Analysis (Agent 3)
                  </h2>
                </div>
                <RCAResultPanel result={rcaResult} />
              </div>
            )}
          </div>
        ) : (
          /* Placeholder / Presentation / Demo Scenario Cards (Neat & Clean Grid on Dashboard) */
          <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col items-center justify-center space-y-10">
            {/* Header Banner */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl bg-linear-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text">
                FactoryOps AI Platform
              </h1>
              <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                Platform intelijen manufaktur untuk mendeteksi deviasi mesin secara otomatis, menghitung KPI OEE, dan melacak akar penyebab masalah menggunakan kolaborasi 3 Agen AI terspesialisasi.
              </p>
            </div>

            {/* Skenario / Demo Cards */}
            <div className="w-full">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Simulasi Pipeline */}
                <button
                  onClick={onSimulateDemo}
                  disabled={isLoading}
                  className="flex flex-col text-left p-5 rounded-2xl bg-bg-secondary/60 border border-bd hover:border-emerald-500/50 hover:bg-[#141c38]/80 transition-all duration-300 group shadow-md hover:shadow-emerald-500/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <img src="/icons/pipeline-run.svg" className="w-[18px] h-[18px] invert opacity-80 group-hover:opacity-100 transition-all" alt="Pipeline" />
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Skenario 1: Simulasi Pipeline
                  </h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                    Jalankan analisis KPI & RCA stasiun hidrolik Lini 2 secara otomatis menggunakan sampel data sensor terintegrasi.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    Simulasikan Sekarang <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

                {/* Tanya SOP */}
                <button
                  onClick={() => onSendPrompt("Tampilkan isi SOP terkait Hydraulic Pressure.")}
                  disabled={isLoading}
                  className="flex flex-col text-left p-5 rounded-2xl bg-bg-secondary/60 border border-bd hover:border-blue-500/50 hover:bg-[#141c38]/80 transition-all duration-300 group shadow-md hover:shadow-blue-500/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <img src="/icons/pdf-document.svg" className="w-[18px] h-[18px] invert opacity-80 group-hover:opacity-100 transition-all" alt="PDF Document" />
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Skenario 2: Tanya SOP (RAG)
                  </h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                    Tampilkan atau cari isi dokumen SOP mengenai Hydraulic Pressure secara langsung dari basis pengetahuan RAG.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-blue-400">
                    Tanya Agen RAG <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

                {/* Arsitektur Kolaborasi */}
                <button
                  onClick={() => onSendPrompt("Secara teori, bagaimana arsitektur multi-agent (Orchestrator, KPI Analyst, dan RCA Analyst) saling berkolaborasi?")}
                  disabled={isLoading}
                  className="flex flex-col text-left p-5 rounded-2xl bg-bg-secondary/60 border border-bd hover:border-violet-500/50 hover:bg-[#141c38]/80 transition-all duration-300 group shadow-md hover:shadow-violet-500/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <img src="/icons/blueprint.svg" className="w-[18px] h-[18px] invert opacity-80 group-hover:opacity-100 transition-all" alt="Blueprint" />
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">
                    Skenario 3: Penjelasan Arsitektur
                  </h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                    Dapatkan penjelasan konsep teori kolaborasi dan pembagian tugas antara Agent 1, Agent 2, dan Agent 3.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-violet-400">
                    Tanya Kolaborasi <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Workflow Step Indicator */}
            <div className="w-full bg-bg-secondary/40 border border-bd rounded-2xl p-5 text-left space-y-4">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block border-b border-bd pb-1.5">
                Alur Kerja & Pembagian Agen
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: '1', title: 'Data & RAG Upload', desc: 'Data sensor & dokumen PDF diunggah ke memori RAG Agent 1.' },
                  { step: '2', title: 'Deteksi Anomali ML', desc: 'Agent 2 menjalankan model Machine Learning untuk mendeteksi deviasi.' },
                  { step: '3', title: 'Root Cause SHAP', desc: 'Agent 3 melacak kontribusi fitur penyebab eror dengan analisis SHAP.' },
                  { step: '4', title: 'Generative Advice', desc: 'Agent 1 merumuskan solusi berbasis SOP menggunakan LLM Reasoning.' }
                ].map((s, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-xl bg-bg-card/40 border border-bd/50">
                    <div className="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 font-mono">
                      {s.step}
                    </div>
                    <div className="text-xs font-semibold text-slate-300 mt-1">{s.title}</div>
                    <div className="text-[10px] text-slate-500 leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
