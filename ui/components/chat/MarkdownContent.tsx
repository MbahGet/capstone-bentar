import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1.5 first:mt-0 border-b border-white/10 pb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-slate-200 mt-2.5 mb-1 first:mt-0">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-300">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-4 space-y-0.5 list-none">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-4 space-y-0.5 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-slate-200 leading-relaxed flex gap-2 items-start">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400/50 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        code: ({ className, children }: React.ComponentPropsWithoutRef<'code'>) => {
          const isBlock = className?.startsWith('language-');
          return isBlock ? (
            <code className={`block bg-black/40 border border-white/10 text-emerald-300 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre my-2 ${className ?? ''}`}>
              {children}
            </code>
          ) : (
            <code className="bg-black/40 border border-white/10 text-blue-300 rounded px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 pl-3 border-l-2 border-blue-400/40 text-slate-400 italic text-sm">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-white/10" />,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-black/30 text-slate-400 uppercase tracking-wide">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-slate-300">{children}</td>,
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