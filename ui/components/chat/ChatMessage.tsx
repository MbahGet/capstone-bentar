import { Message } from '@/lib/types';
import { Bot, User, AlertCircle } from 'lucide-react';

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  agent2: { label: 'KPI Analyst', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  agent3: { label: 'RCA Analyst', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  none: { label: 'Orchestrator', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
};

function AgentBadge({ agent }: { agent: string }) {
  const info = AGENT_LABELS[agent] ?? { label: agent, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 h-5">
      {[0, 100, 200].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-slide">
        <div className="max-w-[72%] flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            <User size={12} />
          </div>
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-slide">
      <div className="max-w-[80%] flex flex-col items-start gap-1">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Bot size={12} className="text-blue-400" />
          <span>Konsultan AI</span>
          <span>·</span>
          <span>{message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${
            message.isError
              ? 'bg-red-500/10 border border-red-500/30 text-red-300'
              : 'bg-[#141c2e] border border-[#1e2d4a] text-slate-200'
          }`}
        >
          {message.isLoading ? (
            <TypingIndicator />
          ) : message.isError ? (
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{message.content}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Agent badges & sources */}
        {!message.isLoading && !message.isError && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {(message.agentsCalled ?? []).map((a) => (
              <AgentBadge key={a} agent={a} />
            ))}
            {(message.sources ?? []).length > 0 && (
              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                {message.sources!.length} dokumen direferensikan
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
