'use client';

import React from 'react';
import { Message } from '@/lib/types';
import { Bot, User, AlertCircle, FileText } from 'lucide-react';
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-6">
      {[0, 120, 240].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

/* ─── Markdown prose renderer ─────────────────────────────────────────────── */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        /* Headings */
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1.5 first:mt-0 border-b border-[#1e2d4a] pb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-slate-200 mt-2.5 mb-1 first:mt-0">{children}</h3>
        ),

        /* Paragraphs */
        p: ({ children }) => (
          <p className="text-sm text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),

        /* Bold & Italic */
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-300">{children}</em>
        ),

        /* Lists */
        ul: ({ children }) => (
          <ul className="my-2 ml-4 space-y-0.5 list-none">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-4 space-y-0.5 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-slate-200 leading-relaxed flex gap-2 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
            <span>{children}</span>
          </li>
        ),

        /* Code — react-markdown v10: no inline prop, detect via className */
        code: ({ className, children }: React.ComponentPropsWithoutRef<'code'>) => {
          const isBlock = className?.startsWith('language-');
          return isBlock ? (
            <code className={`block bg-[#0a0e1a] border border-[#1e2d4a] text-emerald-300 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre my-2 ${className ?? ''}`}>
              {children}
            </code>
          ) : (
            <code className="bg-[#0a0e1a] border border-[#1e2d4a] text-blue-300 rounded px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          );
        },

        /* Code blocks */
        pre: ({ children }) => (
          <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>
        ),

        /* Blockquote */
        blockquote: ({ children }) => (
          <blockquote className="my-2 pl-3 border-l-2 border-blue-500/50 text-slate-400 italic text-sm">
            {children}
          </blockquote>
        ),

        /* Horizontal rule */
        hr: () => <hr className="my-3 border-[#1e2d4a]" />,

        /* Table */
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-lg border border-[#1e2d4a]">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[#0a0e1a] text-slate-400 uppercase tracking-wide">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-[#1e2d4a]">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-[#0a0e1a]/50 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-slate-300">{children}</td>,

        /* Links */
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-slide">
        <div className="max-w-[72%] flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            <User size={13} />
          </div>
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-slide">
      <div className="max-w-[85%] flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Bot size={13} className="text-blue-400" />
          <span>Konsultan AI</span>
          <span>·</span>
          <span>{message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed w-full ${
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
            <MarkdownContent content={message.content} />
          )}
        </div>

        {!message.isLoading && !message.isError && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {(message.agentsCalled ?? []).map((a) => (
              <AgentBadge key={a} agent={a} />
            ))}
            {(message.sources ?? []).length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <FileText size={11} />
                {message.sources!.length} dokumen
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
