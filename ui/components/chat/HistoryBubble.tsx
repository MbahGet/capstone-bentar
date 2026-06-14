import { ChatSession, formatHistoryTimestamp } from "@/lib/history";
import { AGENT_LABELS } from "@/utils/AgentLabels";
import { User, AlertCircle, Bot } from "lucide-react";

export function HistoryBubble({ msg }: { msg: ChatSession['messages'][number] }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
        isUser
          ? 'bg-blue-600/20 border-blue-500/30'
          : msg.isError
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-slate-700/40 border-slate-600/20'
      }`}>
        {isUser
          ? <User size={12} className="text-blue-400" />
          : msg.isError
          ? <AlertCircle size={12} className="text-red-400" />
          : <Bot size={12} className="text-slate-400" />
        }
      </div>
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="text-xs text-slate-400 font-mono">{formatHistoryTimestamp(msg.timestamp)}</span>
        <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : msg.isError
            ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm'
            : 'bg-[#0a0e1a] border border-[#1e2d4a] text-slate-200 rounded-tl-sm'
        }`}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        {!isUser && (msg.agentsCalled?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.agentsCalled!.map((a) => {
              const info = AGENT_LABELS[a] ?? AGENT_LABELS['none'];
              return (
                <span key={a} className={`text-xs px-2 py-0.5 rounded border font-medium ${info.color}`}>
                  {info.label}
                </span>
              );
            })}
            {(msg.sources?.length ?? 0) > 0 && (
              <span className="text-xs text-slate-400">{msg.sources!.length} dokumen</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}