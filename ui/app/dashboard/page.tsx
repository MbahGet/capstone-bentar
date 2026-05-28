'use client';

import { useState, useCallback, useEffect } from 'react';
import { Message, AgentHealth, FileAttachment } from '@/lib/types';
import { sendChat, uploadPDF, analyzeAll, checkHealth, writeActivityLog } from '@/lib/api';
import {
  saveChatSession,
  loadChatHistory,
  ChatSession,
  HistoryMessage,
} from '@/lib/history';
import ChatWindow from '@/components/chat/ChatWindow';
import HistorySidebar from '@/components/history/HistorySidebar';
import DashboardPanel from '@/components/dashboard/DashboardPanel';
import { Clock, ArrowLeft } from 'lucide-react';

function makeWelcome(): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      'Selamat datang di **FactoryOps Copilot**\n\n' +
      'Saya bisa membantu Anda dengan:\n' +
      ' - 📊 **Analisis KPI** (OEE, downtime, defect rate)\n' +
      ' - 🔍 **Root Cause Analysis** (SHAP + narasi fishbone)\n' +
      ' - 📎 **Upload CSV** (attach file untuk analisis otomatis)\n' +
      ' - 📄 **Upload PDF** (tambah dokumen ke basis pengetahuan)\n\n' +
      'Ketik pertanyaan atau attach CSV untuk memulai.',
    timestamp: new Date(),
    agentsCalled: [],
  };
}

function toMessage(hm: HistoryMessage, i: number): Message {
  return {
    id: `r-${i}-${hm.timestamp}`,
    role: hm.role as 'user' | 'assistant',
    content: hm.content,
    agentsCalled: hm.agentsCalled,
    sources: hm.sources,
    timestamp: new Date(hm.timestamp),
    isError: hm.isError,
    attachments: hm.attachments,
    kpiResult: hm.kpiResult,
    rcaResult: hm.rcaResult,
  };
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([makeWelcome()]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [archiveLabel, setArchiveLabel] = useState('');
  const [assistantTab, setAssistantTab] = useState<'chat' | 'history'>('chat');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [agentHealth, setAgentHealth] = useState<Record<string, AgentHealth>>({
    agent1: { status: 'unknown', latency: null, lastCheck: null },
    agent2: { status: 'unknown', latency: null, lastCheck: null },
    agent3: { status: 'unknown', latency: null, lastCheck: null },
  });

  const latestKPI = [...messages].reverse().find((m) => m.kpiResult)?.kpiResult;
  const latestRCA = [...messages].reverse().find((m) => m.rcaResult)?.rcaResult;

  // Run health checks
  async function runHealthChecks() {
    const agents = ['agent1', 'agent2', 'agent3'] as const;
    const results = await Promise.allSettled(agents.map((a) => checkHealth(a)));
    const now = new Date();
    const updated: Record<string, AgentHealth> = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        updated[agents[i]] = {
          status: r.value.status as AgentHealth['status'],
          latency: r.value.latency,
          lastCheck: now,
          error: r.value.error,
        };
      } else {
        updated[agents[i]] = { status: 'offline', latency: null, lastCheck: now, error: 'Check failed' };
      }
    });
    setAgentHealth(updated);
  }

  // Load history and initialize session on mount
  useEffect(() => {
    const history = loadChatHistory();
    setSessions(history);

    const savedActiveId = localStorage.getItem('bentar_active_session_id');
    if (savedActiveId) {
      const activeSession = history.find((s) => s.id === savedActiveId);
      if (activeSession) {
        setActiveSessionId(savedActiveId);
        const restored = activeSession.messages.filter((m) => m.content || m.attachments || m.kpiResult || m.rcaResult).map(toMessage);
        setMessages(restored.length > 0 ? restored : [makeWelcome()]);

        const sessionDate = new Date(activeSession.startedAt).toDateString();
        const isToday = sessionDate === new Date().toDateString();
        setIsReadOnly(!isToday);
        if (!isToday) {
          setArchiveLabel(
            new Date(activeSession.startedAt).toLocaleDateString('id-ID', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            })
          );
        }
      } else {
        startNewChatSession();
      }
    } else {
      startNewChatSession();
    }

    runHealthChecks();
    const interval = setInterval(runHealthChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  function startNewChatSession() {
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveSessionId(newId);
    localStorage.setItem('bentar_active_session_id', newId);
    setMessages([makeWelcome()]);
    setIsReadOnly(false);
    setArchiveLabel('');
    setAssistantTab('chat');
  }

  const updateSessionInHistory = useCallback((sid: string, startedAt: string, msgs: HistoryMessage[]) => {
    saveChatSession({
      id: sid,
      startedAt,
      messages: msgs,
    });
    setSessions(loadChatHistory());
  }, []);

  function handleNewChat() {
    startNewChatSession();
  }

  function handleSelectHistory(session: ChatSession) {
    const sessionDate = new Date(session.startedAt).toDateString();
    const isToday = sessionDate === new Date().toDateString();

    const restored = session.messages.filter((m) => m.content || m.attachments || m.kpiResult || m.rcaResult).map(toMessage);
    setMessages(restored.length > 0 ? restored : [makeWelcome()]);

    setActiveSessionId(session.id);
    localStorage.setItem('bentar_active_session_id', session.id);

    setIsReadOnly(!isToday);
    if (!isToday) {
      setArchiveLabel(
        new Date(session.startedAt).toLocaleDateString('id-ID', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        })
      );
    } else {
      setArchiveLabel('');
    }
    setAssistantTab('chat');
  }

  function handleReturnToLive() {
    startNewChatSession();
  }

  const handleSend = useCallback(async (content: string, files?: File[]) => {
    if (!activeSessionId) return;

    const csvFiles = files?.filter((f) => f.name.toLowerCase().endsWith('.csv')) ?? [];
    const pdfFiles = files?.filter((f) => f.name.toLowerCase().endsWith('.pdf')) ?? [];
    const hasCSV = csvFiles.length > 0;
    const hasPDF = pdfFiles.length > 0;
    const hasText = content.trim().length > 0;

    // Build attachments for display
    const attachments: FileAttachment[] = (files ?? []).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.name.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf',
    }));

    // Create user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const loadId = (Date.now() + 1).toString();
    const loadMsg: Message = {
      id: loadId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    // Get current session messages to append to
    const currentSessions = loadChatHistory();
    const existingSession = currentSessions.find((s) => s.id === activeSessionId);
    const startedAt = existingSession ? existingSession.startedAt : new Date().toISOString();
    const updatedHistoryMsgs: HistoryMessage[] = existingSession ? [...existingSession.messages] : [];

    // Push user message to history
    updatedHistoryMsgs.push({
      role: 'user',
      content,
      timestamp: userMsg.timestamp.toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Update state and save user message immediately
    setMessages((prev) => [...prev, userMsg, loadMsg]);
    updateSessionInHistory(activeSessionId, startedAt, updatedHistoryMsgs);
    setChatLoading(true);

    try {
      // 1. Upload PDFs to Agent 1 (RAG knowledge base)
      if (hasPDF) {
        for (const pdf of pdfFiles) {
          await uploadPDF(pdf);
          writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: 200, latency: null });
        }
      }

      let assistantContent = '';
      let agentsCalled: string[] = [];
      let sources: string[] = [];
      let kpiResult = undefined;
      let rcaResult = undefined;

      // 2. If CSV attached → run analysis pipeline
      if (hasCSV) {
        const csvFile = csvFiles[0];

        const updateProgress = (_step: string, label: string) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadId ? { ...m, pipelineStatus: label } : m
            )
          );
        };

        const start = Date.now();
        const { kpi, rca } = await analyzeAll(csvFile, updateProgress);
        const latency = Date.now() - start;

        writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });
        writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });

        assistantContent = hasPDF
          ? `PDF berhasil diupload ke basis pengetahuan. Berikut hasil analisis CSV **${csvFile.name}**:`
          : `Berikut hasil analisis CSV **${csvFile.name}**:`;
        agentsCalled = ['agent2', 'agent3'];
        kpiResult = kpi;
        rcaResult = rca;
      }
      // 3. Text-only or PDF-only → send to Agent 1 chat
      else if (hasText) {
        const start = Date.now();
        const data = await sendChat(content);
        const latency = Date.now() - start;
        writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/chat', statusCode: 200, latency });

        assistantContent = hasPDF
          ? `PDF berhasil diupload. ${data.response ?? ''}`
          : data.response ?? 'Tidak ada respons.';
        agentsCalled = data.agents_called ?? [];
        sources = data.sources ?? [];
      }
      // 4. PDF-only
      else if (hasPDF) {
        assistantContent = `✅ ${pdfFiles.length} PDF berhasil diupload ke basis pengetahuan Agent 1. Anda sekarang bisa bertanya tentang isi dokumen tersebut.`;
        agentsCalled = ['agent1'];
      }

      const assistantMsg: Message = {
        id: loadId,
        role: 'assistant',
        content: assistantContent,
        agentsCalled,
        sources,
        timestamp: new Date(),
        isLoading: false,
        kpiResult,
        rcaResult,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadId ? assistantMsg : m)));

      // Append assistant message to history and save
      const finalHistoryMsgs = [
        ...updatedHistoryMsgs,
        {
          role: 'assistant' as const,
          content: assistantContent,
          timestamp: assistantMsg.timestamp.toISOString(),
          agentsCalled,
          sources,
          kpiResult,
          rcaResult,
        }
      ];
      updateSessionInHistory(activeSessionId, startedAt, finalHistoryMsgs);

    } catch (err) {
      console.error(err);
      const errMsg: Message = {
        id: loadId,
        role: 'assistant',
        content: 'Gagal memproses permintaan. Pastikan semua agent sudah berjalan.',
        timestamp: new Date(),
        isLoading: false,
        isError: true,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadId ? errMsg : m)));

      const finalHistoryMsgs = [
        ...updatedHistoryMsgs,
        {
          role: 'assistant' as const,
          content: errMsg.content,
          timestamp: errMsg.timestamp.toISOString(),
          isError: true,
        }
      ];
      updateSessionInHistory(activeSessionId, startedAt, finalHistoryMsgs);
    } finally {
      setChatLoading(false);
    }
  }, [activeSessionId, updateSessionInHistory]);

  const handleSimulateDemo = useCallback(() => {
    if (!activeSessionId) return;

    // Automatically open the floating chat widget
    setIsChatOpen(true);
    setAssistantTab('chat');

    const userMsg: Message = {
      id: `demo-user-${Date.now()}`,
      role: 'user',
      content: 'Simulasikan analisis data mesin pabrik (Data Sensor Lini 2)',
      timestamp: new Date(),
      attachments: [
        {
          id: 'demo-csv',
          name: 'integrated_sensor_line2_oee.csv',
          size: 15420,
          type: 'csv',
        }
      ],
    };

    const loadId = `demo-load-${Date.now()}`;
    const loadMsg: Message = {
      id: loadId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      pipelineStatus: 'Mempersiapkan data demo...',
    };

    const currentSessions = loadChatHistory();
    const existingSession = currentSessions.find((s) => s.id === activeSessionId);
    const startedAt = existingSession ? existingSession.startedAt : new Date().toISOString();
    const updatedHistoryMsgs: HistoryMessage[] = existingSession ? [...existingSession.messages] : [];

    updatedHistoryMsgs.push({
      role: 'user',
      content: userMsg.content,
      timestamp: userMsg.timestamp.toISOString(),
      attachments: userMsg.attachments,
    });

    setMessages((prev) => [...prev, userMsg, loadMsg]);
    updateSessionInHistory(activeSessionId, startedAt, updatedHistoryMsgs);
    setChatLoading(true);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId ? { ...m, pipelineStatus: 'Agent 2: Menghitung OEE, defect rate, & downtime rate...' } : m
        )
      );
    }, 1200);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId ? { ...m, pipelineStatus: 'Agent 3: Menjalankan pemodelan SHAP & analisis sebab-akibat...' } : m
        )
      );
    }, 2400);

    setTimeout(() => {
      const mockKPI = {
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
            level: 'high' as const,
            message: 'OEE Lini 2 turun di bawah target (68.5% < 80.0%) karena frekuensi breakdown tinggi.',
          },
          {
            metric: 'Defect Rate',
            level: 'medium' as const,
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

      const mockRCA = {
        status: 'success',
        summary: {
          total_records_analyzed: 500,
          defect_incidents_detected: 21,
          defect_rate_percentage: 4.2,
        },
        root_causes: [
          { rank: 1, feature: 'hydraulic_pressure_psi', importance_score: 0.42 },
          { rank: 2, feature: 'nozzle_temperature_c', importance_score: 0.28 },
          { rank: 3, feature: 'operator_experience_months', importance_score: 0.15 },
        ],
        explanation: 'Analisis SHAP mengidentifikasi bahwa **hydraulic_pressure_psi** menyumbang kontribusi terbesar (42%) terhadap deviasi operasi. Terjadi penurunan tekanan hidrolik di bawah 80 PSI yang berulang, memicu malfungsi mekanis stasiun penempatan komponen.',
      };

      const resultMsg: Message = {
        id: loadId,
        role: 'assistant',
        content: 'Berikut adalah hasil simulasi analisis data sensor pabrik terintegrasi untuk Lini 2:',
        agentsCalled: ['agent2', 'agent3'],
        timestamp: new Date(),
        isLoading: false,
        kpiResult: mockKPI,
        rcaResult: mockRCA,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadId ? resultMsg : m)));
      setChatLoading(false);

      const finalHistoryMsgs = [
        ...updatedHistoryMsgs,
        {
          role: 'assistant' as const,
          content: resultMsg.content,
          timestamp: resultMsg.timestamp.toISOString(),
          agentsCalled: resultMsg.agentsCalled,
          kpiResult: mockKPI,
          rcaResult: mockRCA,
        }
      ];
      updateSessionInHistory(activeSessionId, startedAt, finalHistoryMsgs);
    }, 3600);

  }, [activeSessionId, updateSessionInHistory]);

  const handleSendPrompt = useCallback((prompt: string) => {
    setIsChatOpen(true);
    setAssistantTab('chat');
    handleSend(prompt);
  }, [handleSend]);

  return (
    <div className="relative w-full overflow-hidden bg-[#070a13]">
      
      {/* ── Main Dashboard Panel (takes full width & height) ── */}
      <main className="w-full h-full overflow-hidden">
        <DashboardPanel
          kpiResult={latestKPI}
          rcaResult={latestRCA}
          onSimulateDemo={handleSimulateDemo}
          onSendPrompt={handleSendPrompt}
          isLoading={chatLoading}
        />
      </main>

      {/* ── Floating Assistant Box Wrapper ── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        
        {/* Floating Chat Window */}
        {isChatOpen && (
          <div className="w-[min(100vw,420px)] h-[min(100vh,80vh)] max-h-[80vh] min-h-[400px] rounded-2xl border border-bd bg-bg-secondary/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-fade-slide">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0b0f19] border-b border-bd shrink-0">
              <div className="flex items-center gap-1.5 bg-bg-card border border-bd rounded-lg p-0.5">
                <button
                  onClick={() => setAssistantTab('chat')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                    assistantTab === 'chat'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <img src="/icons/chat.svg" className="w-[11px] h-[11px] invert opacity-80" alt="Asisten" />
                  Asisten
                </button>
                <button
                  onClick={() => setAssistantTab('history')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                    assistantTab === 'history'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <img src="/icons/history.svg" className="w-[11px] h-[11px] invert opacity-80" alt="Riwayat" />
                  Riwayat
                </button>
              </div>

              {/* Status indicators and close button */}
              <div className="flex items-center gap-3">
                {/* Agent health dots row */}
                <div className="flex items-center gap-2 bg-bg-card px-2.5 py-1 rounded-lg border border-bd">
                  {['agent1', 'agent2', 'agent3'].map((key) => {
                    const value = agentHealth[key];
                    const num = key.replace('agent', '');
                    const color =
                      value.status === 'online'
                        ? 'bg-emerald-500 animate-pulse'
                        : value.status === 'checking'
                        ? 'bg-amber-500'
                        : value.status === 'offline'
                        ? 'bg-rose-500'
                        : 'bg-slate-500';
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-1"
                        title={`Agent ${num}: ${value.status} (${value.latency ? `${value.latency}ms` : 'N/A'})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        <span className="text-[9px] font-bold text-slate-400 font-mono">A{num}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Archive banner */}
            {assistantTab === 'chat' && isReadOnly && (
              <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span className="text-[10px] text-amber-300 font-medium truncate">
                  Arsip — {archiveLabel}
                </span>
                <button
                  onClick={handleReturnToLive}
                  className="ml-auto flex items-center gap-1 text-[9px] text-slate-400 hover:text-white transition-colors shrink-0 bg-bg-card border border-bd px-2 py-0.5 rounded"
                >
                  <ArrowLeft size={9} />
                  Chat Baru
                </button>
              </div>
            )}

            {/* Main tab content */}
            <div className="flex-1 min-h-0">
              {assistantTab === 'chat' ? (
                <ChatWindow
                  messages={messages}
                  onSend={handleSend}
                  isLoading={chatLoading}
                  isReadOnly={isReadOnly}
                />
              ) : (
                <HistorySidebar
                  sessions={sessions}
                  onSelect={handleSelectHistory}
                  onNewChat={handleNewChat}
                />
              )}
            </div>
          </div>
        )}

        {/* Floating Action Button (FAB) */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-[0_8px_30px_rgba(59,130,246,0.3)] flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 relative group"
          title="Buka Asisten AI Copilot"
        >
          {isChatOpen ? (
            <img src="/icons/cross.svg" className="w-[22px] h-[22px] invert" alt="Tutup" />
          ) : (
            <img src="/icons/chat.svg" className="w-[22px] h-[22px] invert" alt="Obrolan" />
          )}
        </button>
      </div>
    </div>
  );
}