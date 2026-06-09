'use client';

import React from 'react';
import { Message } from '@/lib/types';
import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  agent2: { label: 'KPI Analyst', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  agent3: { label: 'RCA Analyst', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  none:   { label: 'Orchestrator', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
};

function AgentBadge({ agent }: { agent: string }) {
  const info = AGENT_LABELS[agent] ?? { label: agent, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 h-6">
        {[0, 120, 240].map((delay) => (
          <span
            key={delay}
            className="w-2 h-2 rounded-full bg-blue-400 animate-bounce-dot"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      {label && <span className="text-xs text-blue-400">{label}</span>}
    </div>
  );
}

function TeaserDashboardCard() {
  return (
    <div className="mt-3 rounded-xl bg-linear-to-r from-violet-500 via-indigo-500 to-blue-500 p-px">
      <div className="rounded-[11px] bg-[#0c0f19] p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <img src="/icons/pipeline-run.svg" className="w-3.5 h-3.5 invert opacity-80" alt="Pipeline" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            Analisis AI Multi-Agent Selesai
            <span className="text-[8px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">Pipeline</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-normal">
            Hasil analisis KPI (Machine Learning) & RCA (SHAP) telah divisualisasikan di panel utama sebelah kiri.
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1.5 first:mt-0 border-b border-bd pb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2.5 mb-1 first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="text-sm text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        ul: ({ children }) => <ul className="my-2 ml-4 space-y-0.5 list-none">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 ml-4 space-y-0.5 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="text-sm text-slate-200 leading-relaxed flex gap-2 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        code: ({ className, children }: React.ComponentPropsWithoutRef<'code'>) => {
          const isBlock = className?.startsWith('language-');
          return isBlock ? (
            <code className={`block bg-bg-primary border border-bd text-emerald-300 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre my-2 ${className ?? ''}`}>
              {children}
            </code>
          ) : (
            <code className="bg-bg-primary border border-bd text-blue-300 rounded px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="my-2 pl-3 border-l-2 border-blue-500/50 text-slate-400 italic text-sm">{children}</blockquote>,
        hr: () => <hr className="my-3 border-bd" />,
        table: ({ children }) => <div className="my-2 overflow-x-auto rounded-lg border border-bd"><table className="w-full text-xs">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-bg-primary text-slate-400 uppercase tracking-wide">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-bd">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-bg-primary/50 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-slate-300">{children}</td>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">{children}</a>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function AttachmentPills({ attachments }: { attachments: NonNullable<Message['attachments']> }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-xs">
          {att.type === 'csv'
            ? <img src="/icons/blueprint.svg" className="w-[11px] h-[11px] invert opacity-80" alt="CSV" />
            : <img src="/icons/pdf-document.svg" className="w-[11px] h-[11px] invert opacity-80" alt="PDF" />
          }
          <span className="text-white/80 max-w-25 truncate">{att.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-slide">
        <div className="max-w-[85%] flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            <User size={13} />
          </div>
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
            {message.content}
            {message.attachments && message.attachments.length > 0 && (
              <AttachmentPills attachments={message.attachments} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-slide">
      <div className="max-w-[95%] flex flex-col items-start gap-1.5 w-full">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <img src="/icons/bot.svg" className="w-[13px] h-[13px] invert opacity-80" alt="Bot" />
          <span>Konsultan AI</span>
          <span>·</span>
          <span>{message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed w-full ${
            message.isError
              ? 'bg-red-500/10 border border-red-500/30 text-red-300'
              : 'bg-bg-card border border-bd text-slate-200'
          }`}
        >
          {message.isLoading ? (
            <TypingIndicator label={message.pipelineStatus} />
          ) : message.isError ? (
            <div className="flex items-center gap-2">
              <img src="/icons/danger.svg" className="w-[14px] h-[14px] invert" alt="Error" />
              <span>{message.content}</span>
            </div>
          ) : (
            <>
              {message.content && <MarkdownContent content={message.content} />}
              {(message.kpiResult || message.rcaResult) && <TeaserDashboardCard />}
            </>
          )}
        </div>

        {!message.isLoading && !message.isError && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {(message.agentsCalled ?? []).map((a) => (
              <AgentBadge key={a} agent={a} />
            ))}
            {(message.sources ?? []).length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <img src="/icons/pdf-document.svg" className="w-[11px] h-[11px] invert opacity-60" alt="Sumber" />
                {message.sources!.length} dokumen
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}