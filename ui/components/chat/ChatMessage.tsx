'use client';

import { Message } from '@/lib/types';
import { AlertCircle, FileText, File, Maximize2, Paperclip } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  agent2: { label: 'KPI Analyst', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  agent3: { label: 'RCA Analyst', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  none:   { label: 'Orchestrator', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

function AgentBadge({ agent }: { agent: string }) {
  const info = AGENT_LABELS[agent] ?? { label: agent, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5 px-1">
      {[0, 120, 240].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-blue-400/70 animate-bounce-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

interface Props {
  message: Message;
  onExpand?: () => void;
}

export default function ChatMessage({ message, onExpand }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-slide px-4">
        <div className="max-w-[70%] overflow-hidden flex flex-col items-end gap-1.5">
          {(message.attachedFiles ?? []).length > 0 && (
            <div className="flex flex-wrap justify-end gap-1">
              {(message.attachedFiles ?? []).map((name, i) => {
                const ext = name.split('.').pop()?.toLowerCase() ?? '';
                const icon = ext === 'pdf' || ['csv','xlsx','xls'].includes(ext)
                  ? <FileText size={10} />
                  : <File size={10} />;
                return (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-700/60 border border-blue-500/30 text-xs text-blue-200 max-w-[160px]">
                    <span className="shrink-0 text-blue-300">{icon}</span>
                    <span className="truncate">{name}</span>
                  </span>
                );
              })}
            </div>
          )}
          {message.content && (
            <div className="bg-blue-600/90 backdrop-blur-sm text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-lg shadow-blue-900/30 break-words w-full">
              {message.content}
            </div>
          )}
          {!message.content && (message.attachedFiles ?? []).length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-300/60">
              <Paperclip size={10} />
              {(message.attachedFiles ?? []).length} file dilampirkan
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-slide px-4">
      <div className="max-w-[75%] flex flex-col items-start gap-1.5">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed w-full backdrop-blur-sm ${
            message.isError
              ? 'bg-red-500/10 border border-red-500/20 text-red-300'
              : 'bg-white/5 border border-white/10'
          }`}
        >
          {message.isLoading ? (
            <TypingIndicator />
          ) : message.isError ? (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={13} />
              <span>{message.content}</span>
            </div>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {!message.isLoading && !message.isError && (
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 px-1">
            {(message.agentsCalled ?? []).map((a) => (
              <AgentBadge key={a} agent={a} />
            ))}
            {(message.sources ?? []).length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <FileText size={10} />
                {message.sources!.length} docs
              </span>
            )}
            {onExpand && (
              <button
                onClick={onExpand}
                className="inline-flex items-center justify-center w-5 h-5 rounded text-slate-600 hover:text-slate-300 hover:bg-white/10 transition-colors"
                aria-label="Buka detail"
              >
                <Maximize2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
