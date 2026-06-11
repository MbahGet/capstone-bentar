'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message, FileAttachment, KPIResult, RCAResult } from '@/lib/types';
import { sendChat, uploadPDF, analyzeAll, writeActivityLog } from '@/lib/api';
import {
  saveChatSession,
  loadChatHistory,
  ChatSession,
  HistoryMessage,
} from '@/lib/history';
import { DEMO_KPI, DEMO_RCA } from '@/lib/demo-data';

function makeWelcome(): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      'Selamat datang di **FactoryOps Copilot**\n\n' +
      'Saya bisa membantu Anda dengan:\n' +
      ' - **Analisis KPI** (OEE, downtime, defect rate)\n' +
      ' - **Root Cause Analysis** (SHAP + narasi fishbone)\n' +
      ' - **Upload CSV** (attach file untuk analisis otomatis)\n' +
      ' - **Upload PDF** (tambah dokumen ke basis pengetahuan)\n\n' +
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

function restoreMessages(session: ChatSession): Message[] {
  const msgs = session.messages
    .filter((m) => m.content || m.attachments || m.kpiResult || m.rcaResult)
    .map(toMessage);
  return msgs.length > 0 ? msgs : [makeWelcome()];
}

function isToday(session: ChatSession): boolean {
  return new Date(session.startedAt).toDateString() === new Date().toDateString();
}

function archiveLabelFor(session: ChatSession): string {
  return new Date(session.startedAt).toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export interface UseChatSessionReturn {
  sessions: ChatSession[];
  messages: Message[];
  loading: boolean;
  isReadOnly: boolean;
  archiveLabel: string;
  latestKPI: KPIResult | undefined;
  latestRCA: RCAResult | undefined;
  handleSend: (content: string, files?: File[]) => Promise<void>;
  handleSimulateDemo: (onOpen: () => void) => void;
  handleSendPrompt: (prompt: string, onOpen: () => void) => void;
  handleNewChat: () => void;
  handleSelectHistory: (session: ChatSession) => void;
  handleReturnToLive: () => void;
}

export function useChatSession(): UseChatSessionReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>([makeWelcome()]);
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [archiveLabel, setArchiveLabel] = useState('');

  const latestKPI = [...messages].reverse().find((m) => m.kpiResult)?.kpiResult;
  const latestRCA = [...messages].reverse().find((m) => m.rcaResult)?.rcaResult;

  const refreshSessions = useCallback(() => setSessions(loadChatHistory()), []);

  const saveSession = useCallback(
    (id: string, startedAt: string, msgs: HistoryMessage[]) => {
      saveChatSession({ id, startedAt, messages: msgs });
      refreshSessions();
    },
    [refreshSessions],
  );

  const startNewSession = useCallback(() => {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveSessionId(id);
    localStorage.setItem('bentar_active_session_id', id);
    setMessages([makeWelcome()]);
    setIsReadOnly(false);
    setArchiveLabel('');
  }, []);

  useEffect(() => {
    const history = loadChatHistory();
    setSessions(history);

    const savedId = localStorage.getItem('bentar_active_session_id');
    if (savedId) {
      const session = history.find((s) => s.id === savedId);
      if (session) {
        setActiveSessionId(savedId);
        setMessages(restoreMessages(session));
        const today = isToday(session);
        setIsReadOnly(!today);
        if (!today) setArchiveLabel(archiveLabelFor(session));
      } else {
        startNewSession();
      }
    } else {
      startNewSession();
    }
  }, [startNewSession]);

  const handleNewChat = startNewSession;
  const handleReturnToLive = startNewSession;

  const handleSelectHistory = useCallback((session: ChatSession) => {
    setMessages(restoreMessages(session));
    setActiveSessionId(session.id);
    localStorage.setItem('bentar_active_session_id', session.id);
    const today = isToday(session);
    setIsReadOnly(!today);
    setArchiveLabel(today ? '' : archiveLabelFor(session));
  }, []);

  const handleSend = useCallback(async (content: string, files?: File[]) => {
    if (!activeSessionId) return;

    const csvFiles = files?.filter((f) => f.name.toLowerCase().endsWith('.csv')) ?? [];
    const pdfFiles = files?.filter((f) => f.name.toLowerCase().endsWith('.pdf')) ?? [];
    const hasCSV = csvFiles.length > 0;
    const hasPDF = pdfFiles.length > 0;
    const hasText = content.trim().length > 0;

    const attachments: FileAttachment[] = (files ?? []).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.name.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf',
    }));

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

    const current = loadChatHistory();
    const existing = current.find((s) => s.id === activeSessionId);
    const startedAt = existing?.startedAt ?? new Date().toISOString();
    const histMsgs: HistoryMessage[] = existing ? [...existing.messages] : [];
    histMsgs.push({
      role: 'user',
      content,
      timestamp: userMsg.timestamp.toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setMessages((prev) => [...prev, userMsg, loadMsg]);
    saveSession(activeSessionId, startedAt, histMsgs);
    setLoading(true);

    try {
      if (hasPDF) {
        for (const pdf of pdfFiles) {
          await uploadPDF(pdf);
          writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/upload', statusCode: 200, latency: null });
        }
      }

      let assistantContent = '';
      let agentsCalled: string[] = [];
      let sources: string[] = [];
      let kpiResult: KPIResult | undefined;
      let rcaResult: RCAResult | undefined;

      if (hasCSV) {
        const csvFile = csvFiles[0];
        const onProgress = (_step: string, label: string) =>
          setMessages((prev) => prev.map((m) => m.id === loadId ? { ...m, pipelineStatus: label } : m));

        const start = Date.now();
        const { kpi, rca } = await analyzeAll(csvFile, onProgress);
        const latency = Date.now() - start;

        writeActivityLog({ agent: 'agent2', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });
        writeActivityLog({ agent: 'agent3', method: 'POST', endpoint: '/analyze', statusCode: 200, latency });

        assistantContent = hasPDF
          ? `PDF berhasil diupload ke basis pengetahuan. Berikut hasil analisis CSV **${csvFile.name}**:`
          : `Berikut hasil analisis CSV **${csvFile.name}**:`;
        agentsCalled = ['agent2', 'agent3'];
        kpiResult = kpi;
        rcaResult = rca;

      } else if (hasText) {
        const start = Date.now();
        const data = await sendChat(content);
        const latency = Date.now() - start;
        writeActivityLog({ agent: 'agent1', method: 'POST', endpoint: '/webhook/chat', statusCode: 200, latency });

        assistantContent = hasPDF
          ? `PDF berhasil diupload. ${data.response ?? ''}`
          : (data.response ?? 'Tidak ada respons.');
        agentsCalled = data.agents_called ?? [];
        sources = data.sources ?? [];

      } else if (hasPDF) {
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
      saveSession(activeSessionId, startedAt, [
        ...histMsgs,
        {
          role: 'assistant',
          content: assistantContent,
          timestamp: assistantMsg.timestamp.toISOString(),
          agentsCalled,
          sources,
          kpiResult,
          rcaResult,
        },
      ]);

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
      saveSession(activeSessionId, startedAt, [
        ...histMsgs,
        {
          role: 'assistant',
          content: errMsg.content,
          timestamp: errMsg.timestamp.toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, saveSession]);

  const handleSimulateDemo = useCallback((onOpen: () => void) => {
    if (!activeSessionId) return;
    onOpen();

    const now = new Date();
    const userMsg: Message = {
      id: `demo-user-${Date.now()}`,
      role: 'user',
      content: 'Simulasikan analisis data mesin pabrik (Data Sensor Lini 2)',
      timestamp: now,
      attachments: [{ id: 'demo-csv', name: 'integrated_sensor_line2_oee.csv', size: 15420, type: 'csv' }],
    };

    const loadId = `demo-load-${Date.now()}`;
    const loadMsg: Message = {
      id: loadId,
      role: 'assistant',
      content: '',
      timestamp: now,
      isLoading: true,
      pipelineStatus: 'Mempersiapkan data demo...',
    };

    const current = loadChatHistory();
    const existing = current.find((s) => s.id === activeSessionId);
    const startedAt = existing?.startedAt ?? now.toISOString();
    const histMsgs: HistoryMessage[] = existing ? [...existing.messages] : [];
    histMsgs.push({
      role: 'user',
      content: userMsg.content,
      timestamp: now.toISOString(),
      attachments: userMsg.attachments,
    });

    setMessages((prev) => [...prev, userMsg, loadMsg]);
    saveSession(activeSessionId, startedAt, histMsgs);
    setLoading(true);

    const update = (label: string) =>
      setMessages((prev) => prev.map((m) => m.id === loadId ? { ...m, pipelineStatus: label } : m));

    setTimeout(() => update('Agent 2: Menghitung OEE, defect rate, & downtime rate...'), 1200);
    setTimeout(() => update('Agent 3: Menjalankan pemodelan SHAP & analisis sebab-akibat...'), 2400);

    setTimeout(() => {
      const resultMsg: Message = {
        id: loadId,
        role: 'assistant',
        content: 'Berikut adalah hasil simulasi analisis data sensor pabrik terintegrasi untuk Lini 2:',
        agentsCalled: ['agent2', 'agent3'],
        timestamp: new Date(),
        isLoading: false,
        kpiResult: DEMO_KPI,
        rcaResult: DEMO_RCA,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadId ? resultMsg : m)));
      setLoading(false);
      saveSession(activeSessionId, startedAt, [
        ...histMsgs,
        {
          role: 'assistant',
          content: resultMsg.content,
          timestamp: resultMsg.timestamp.toISOString(),
          agentsCalled: resultMsg.agentsCalled,
          kpiResult: DEMO_KPI,
          rcaResult: DEMO_RCA,
        },
      ]);
    }, 3600);
  }, [activeSessionId, saveSession]);

  const handleSendPrompt = useCallback((prompt: string, onOpen: () => void) => {
    onOpen();
    handleSend(prompt);
  }, [handleSend]);

  return {
    sessions,
    messages,
    loading,
    isReadOnly,
    archiveLabel,
    latestKPI,
    latestRCA,
    handleSend,
    handleSimulateDemo,
    handleSendPrompt,
    handleNewChat,
    handleSelectHistory,
    handleReturnToLive,
  };
}