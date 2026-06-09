'use client';

import { useState, useCallback } from 'react';
import { useAgentHealth } from '@/lib/hooks/useAgentHealth';
import { useChatSession } from '@/lib/hooks/useChatSession';
import DashboardPanel from '@/components/dashboard/DashboardPanel';
import FloatingChatWidget from '@/components/chat/FloatingChatWidget';

export default function DashboardPage() {
  const agentHealth = useAgentHealth();
  const chat        = useChatSession();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = useCallback(() => setIsChatOpen(true), []);

  return (
    <div className="relative w-full overflow-hidden bg-[#070a13]">
      <main className="w-full h-full overflow-hidden">
        <DashboardPanel
          kpiResult={chat.latestKPI}
          rcaResult={chat.latestRCA}
          onSimulateDemo={() => chat.handleSimulateDemo(openChat)}
          onSendPrompt={(p) => chat.handleSendPrompt(p, openChat)}
          isLoading={chat.loading}
        />
      </main>

      <FloatingChatWidget
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((v) => !v)}
        sessions={chat.sessions}
        messages={chat.messages}
        agentHealth={agentHealth}
        isReadOnly={chat.isReadOnly}
        archiveLabel={chat.archiveLabel}
        loading={chat.loading}
        onSend={chat.handleSend}
        onSelectHistory={chat.handleSelectHistory}
        onNewChat={chat.handleNewChat}
        onReturnToLive={chat.handleReturnToLive}
      />
    </div>
  );
}