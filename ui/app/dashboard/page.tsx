'use client';

import { useState, useCallback } from 'react';
import { Message, KPIResult, RCAResult, UploadedFile } from '@/lib/types';
import { sendChat, uploadPDF, analyzeKPI, analyzeRCA, writeActivityLog } from '@/lib/api';
import ChatWindow from '@/components/chat/ChatWindow';
import PDFUpload from '@/components/upload/PDFUpload';
import CSVUpload from '@/components/upload/CSVUpload';
import KPICard from '@/components/kpi/KPICard';
import AlertList from '@/components/kpi/AlertList';
import DeviationTable from '@/components/kpi/DeviationTable';
import RCAResultPanel from '@/components/rca/RCAResult';
import {
  FileText,
  BarChart3,
  GitBranch,
  X,
  Info,
  Layers,
} from 'lucide-react';

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Selamat datang di FactoryOps Copilot. Saya dapat membantu menganalisis data produksi, OEE, downtime, defect rate, dan melakukan analisis akar masalah (RCA).\n\nUpload dokumen PDF (SOP, manual, laporan QC) untuk referensi, atau ajukan pertanyaan langsung.',
  timestamp: new Date(),
  agentsCalled: [],
};

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-slate-700 font-medium px-1">{title}</div>
      {children}
    </div>
  );
}

function UploadedFilePill({ file }: { file: UploadedFile }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141c2e] border border-[#1e2d4a]">
      <FileText size={12} className="text-slate-500 shrink-0" />
      <span className="text-[11px] text-slate-400 truncate">{file.name}</span>
      <span
        className={`ml-auto text-[9px] shrink-0 ${
          file.status === 'done' ? 'text-emerald-500' : file.status === 'error' ? 'text-red-400' : 'text-amber-400'
        }`}
      >
        {file.status === 'done' ? '✓' : file.status === 'error' ? '✗' : '…'}
      </span>
    </div>
  );
}

type ResultTab = 'kpi' | 'rca';

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [chatLoading, setChatLoading] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [rcaLoading, setRcaLoading] = useState(false);
  const [kpiResult, setKpiResult] = useState<KPIResult | null>(null);
  const [rcaResult, setRcaResult] = useState<RCAResult | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('kpi');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [rcaFiles, setRcaFiles] = useState<{ productionLog?: File; defectData?: File; downtimeLog?: File }>({});

  const addFile = (name: string, size: number, type: 'pdf' | 'csv', status: UploadedFile['status']) => {
    const f: UploadedFile = { id: Date.now().toString(), name, size, type, uploadedAt: new Date(), status };
    setFiles((prev) => [f, ...prev].slice(0, 10));
    return f;
  };

  const handleSend = useCallback(async (content: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    const loadId = (Date.now() + 1).toString();
    const loadMsg: Message = { id: loadId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true };
    setMessages((prev) => [...prev, userMsg, loadMsg]);
    setChatLoading(true);

    try {
      const start = Date.now();
      const data = await sendChat(content);
      const latency = Date.now() - start;
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/chat', statusCode: 200, latency });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId
            ? { ...m, content: data.response ?? 'Tidak ada respons.', agentsCalled: data.agents_called ?? [], sources: data.sources ?? [], isLoading: false }
            : m
        )
      );
    } catch {
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/chat', statusCode: null, latency: null, error: 'Connection failed' });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId
            ? { ...m, content: 'Agent 1 tidak dapat dijangkau. Pastikan sistem sudah berjalan.', isLoading: false, isError: true }
            : m
        )
      );
    } finally {
      setChatLoading(false);
    }
  }, []);

  const handleUploadPDF = useCallback(async (file: File) => {
    const f = addFile(file.name, file.size, 'pdf', 'uploading');
    try {
      await uploadPDF(file);
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload-pdf', statusCode: 200, latency: null });
      setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: 'done' } : x)));
    } catch {
      writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload-pdf', statusCode: null, latency: null, error: 'Upload failed' });
      setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: 'error' } : x)));
      throw new Error('Upload failed');
    }
  }, []);

  const handleAnalyzeKPI = useCallback(async (file: File) => {
    setKpiLoading(true);
    try {
      const start = Date.now();
      const result = await analyzeKPI(file);
      const latency = Date.now() - start;
      writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });
      setKpiResult(result);
      setResultTab('kpi');
    } catch {
      writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: null, latency: null, error: 'Analysis failed' });
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const handleAnalyzeRCA = useCallback(async () => {
    const { productionLog, defectData, downtimeLog } = rcaFiles;
    if (!productionLog || !defectData || !downtimeLog) return;
    setRcaLoading(true);
    try {
      const start = Date.now();
      const result = await analyzeRCA(productionLog, defectData, downtimeLog);
      const latency = Date.now() - start;
      writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });
      setRcaResult(result);
      setResultTab('rca');
    } catch {
      writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: null, latency: null, error: 'RCA failed' });
    } finally {
      setRcaLoading(false);
    }
  }, [rcaFiles]);

  const hasResults = kpiResult !== null || rcaResult !== null;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-[#1e2d4a] bg-[#0f1629] overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* PDF section */}
          <SidebarSection title="Dokumen">
            <PDFUpload onUpload={handleUploadPDF} />
            {files.filter((f) => f.type === 'pdf').map((f) => (
              <UploadedFilePill key={f.id} file={f} />
            ))}
          </SidebarSection>

          {/* KPI section */}
          <SidebarSection title="Analisis KPI (Agent 2)">
            <CSVUpload
              label="Upload CSV Produksi"
              description="production_daily.csv"
              onAnalyze={handleAnalyzeKPI}
              loading={kpiLoading}
            />
          </SidebarSection>

          {/* RCA section */}
          <SidebarSection title="Analisis RCA (Agent 3)">
            <div className="space-y-2">
              {(
                [
                  { key: 'productionLog', label: 'Production Log', hint: 'production_log.csv' },
                  { key: 'defectData', label: 'Defect Data', hint: 'defect_data.csv' },
                  { key: 'downtimeLog', label: 'Downtime Log', hint: 'downtime_log.csv' },
                ] as const
              ).map(({ key, label, hint }) => (
                <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1e2d4a] bg-[#141c2e] hover:border-amber-500/30 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setRcaFiles((prev) => ({ ...prev, [key]: f }));
                      e.target.value = '';
                    }}
                  />
                  <GitBranch size={12} className="text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400">{label}</div>
                    <div className="text-[10px] text-slate-700 truncate">
                      {rcaFiles[key]?.name ?? hint}
                    </div>
                  </div>
                  {rcaFiles[key] && <span className="ml-auto text-emerald-500 text-[10px]">✓</span>}
                </label>
              ))}
              <button
                onClick={handleAnalyzeRCA}
                disabled={!rcaFiles.productionLog || !rcaFiles.defectData || !rcaFiles.downtimeLog || rcaLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {rcaLoading ? 'Menganalisis...' : 'Jalankan RCA'}
              </button>
            </div>
          </SidebarSection>

          {/* Help */}
          <SidebarSection title="Panduan">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#141c2e] border border-[#1e2d4a]">
              <Info size={12} className="text-slate-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-700 leading-relaxed">
                Chat untuk bertanya tentang OEE, downtime, atau defect. Upload CSV langsung untuk analisis cepat.
              </p>
            </div>
          </SidebarSection>
        </div>
      </aside>

      {/* Chat area */}
      <ChatWindow messages={messages} onSend={handleSend} isLoading={chatLoading} />

      {/* Analysis panel */}
      {hasResults && (
        <aside className="w-80 shrink-0 flex flex-col border-l border-[#1e2d4a] bg-[#0f1629] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2d4a] shrink-0">
            <Layers size={14} className="text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Hasil Analisis</span>
            <button
              onClick={() => { setKpiResult(null); setRcaResult(null); }}
              className="ml-auto p-1 rounded-lg hover:bg-[#1a2540] text-slate-600 hover:text-slate-400 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1e2d4a] shrink-0">
            {kpiResult && (
              <button
                onClick={() => setResultTab('kpi')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  resultTab === 'kpi' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-400'
                }`}
              >
                <BarChart3 size={12} />
                KPI
              </button>
            )}
            {rcaResult && (
              <button
                onClick={() => setResultTab('rca')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  resultTab === 'rca' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-600 hover:text-slate-400'
                }`}
              >
                <GitBranch size={12} />
                RCA
              </button>
            )}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {resultTab === 'kpi' && kpiResult && (
              <>
                {/* KPI summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  <KPICard
                    label="OEE"
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
                    label="Deviasi"
                    value={kpiResult.model_metrics.deviation_count.toString()}
                    unit="mesin"
                    status={kpiResult.model_metrics.deviation_count === 0 ? 'good' : 'warning'}
                  />
                </div>

                <AlertList alerts={kpiResult.alerts} />
                <DeviationTable deviations={kpiResult.top_deviations} />

                {kpiResult.recommendation?.text && (
                  <div className="rounded-xl border border-[#1e2d4a] bg-[#141c2e]">
                    <div className="px-3 py-2 border-b border-[#1e2d4a] text-[11px] font-medium text-slate-400">
                      Rekomendasi AI
                    </div>
                    <p className="px-3 py-3 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {kpiResult.recommendation.text}
                    </p>
                  </div>
                )}
              </>
            )}

            {resultTab === 'rca' && rcaResult && (
              <RCAResultPanel result={rcaResult} />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
