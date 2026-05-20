'use client';

import { AgentHealth } from '@/lib/types';

interface Props {
  agent1: AgentHealth;
  agent2: AgentHealth;
  agent3: AgentHealth;
}

function NodeBox({
  label,
  sublabel,
  status,
  x,
  y,
  w = 100,
  h = 44,
  color = '#1e2d4a',
  textColor = '#94a3b8',
}: {
  label: string;
  sublabel?: string;
  status?: 'online' | 'offline' | 'checking' | 'unknown';
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
  textColor?: string;
}) {
  const statusColor = status === 'online' ? '#10b981' : status === 'offline' ? '#ef4444' : status === 'checking' ? '#f59e0b' : '#475569';

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="#141c2e" stroke={color} strokeWidth={1.5} />
      {status && (
        <circle cx={x + w - 10} cy={y + 10} r={4} fill={statusColor} opacity={0.9} />
      )}
      <text x={x + w / 2} y={y + (sublabel ? h / 2 - 4 : h / 2 + 5)} textAnchor="middle" fill={textColor} fontSize={11} fontWeight="600">
        {label}
      </text>
      {sublabel && (
        <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fill="#475569" fontSize={9}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, active = true }: { x1: number; y1: number; x2: number; y2: number; active?: boolean }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={active ? '#3b82f6' : '#1e2d4a'}
      strokeWidth={1.5}
      strokeDasharray={active ? '6 3' : '4 4'}
      markerEnd="url(#arrow)"
      className={active ? 'animate-dash-flow' : ''}
    />
  );
}

function FlowArrow({ x1, y1, x2, y2, active = true }: { x1: number; y1: number; x2: number; y2: number; active?: boolean }) {
  const mid = (x1 + x2) / 2;
  return (
    <path
      d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
      fill="none"
      stroke={active ? '#3b82f6' : '#1e2d4a'}
      strokeWidth={1.5}
      strokeDasharray={active ? '6 3' : '4 4'}
      markerEnd="url(#arrow)"
      className={active ? 'animate-dash-flow' : ''}
    />
  );
}

export default function PipelineFlow({ agent1, agent2, agent3 }: Props) {
  const a1Online = agent1.status === 'online';
  const a2Online = agent2.status === 'online';
  const a3Online = agent3.status === 'online';

  // SVG viewport: 800 x 220
  return (
    <div className="rounded-2xl border border-[#1e2d4a] bg-[#0f1629] p-5">
      <div className="text-[11px] text-slate-600 uppercase tracking-widest mb-4">Alur Pipeline</div>
      <svg viewBox="0 0 820 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arrow-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#1e2d4a" />
          </marker>
        </defs>

        {/* User */}
        <NodeBox label="User" sublabel="Query / File" x={20} y={78} w={90} h={44} color="#2d4275" textColor="#cbd5e1" />

        {/* Arrow: User → Agent 1 */}
        <Arrow x1={112} y1={100} x2={178} y2={100} active />

        {/* Agent 1 */}
        <NodeBox label="Agent 1" sublabel="n8n + Qdrant" x={180} y={78} w={110} h={44} color={a1Online ? '#1d4ed8' : '#1e2d4a'} textColor={a1Online ? '#93c5fd' : '#475569'} status={agent1.status} />

        {/* Arrow: Agent 1 → Qdrant */}
        <FlowArrow x1={290} y1={88} x2={380} y2={38} active={a1Online} />

        {/* Qdrant */}
        <NodeBox label="Qdrant" sublabel="Vector DB" x={382} y={16} w={96} h={44} color="#1e2d4a" textColor="#64748b" />

        {/* Arrow: Agent 1 → Agent 2 */}
        <Arrow x1={290} y1={96} x2={380} y2={96} active={a1Online && a2Online} />

        {/* Agent 2 */}
        <NodeBox label="Agent 2" sublabel="KPI + XGBoost" x={382} y={74} w={114} h={44} color={a2Online ? '#5b21b6' : '#1e2d4a'} textColor={a2Online ? '#c4b5fd' : '#475569'} status={agent2.status} />

        {/* Arrow: Agent 1 → Agent 3 */}
        <FlowArrow x1={290} y1={112} x2={380} y2={148} active={a1Online && a3Online} />

        {/* Agent 3 */}
        <NodeBox label="Agent 3" sublabel="RCA + SHAP" x={382} y={130} w={114} h={44} color={a3Online ? '#92400e' : '#1e2d4a'} textColor={a3Online ? '#fcd34d' : '#475569'} status={agent3.status} />

        {/* Arrows to Ollama */}
        <Arrow x1={498} y1={96} x2={570} y2={78} active={a2Online} />
        <Arrow x1={498} y1={152} x2={570} y2={122} active={a3Online} />

        {/* Ollama */}
        <NodeBox label="Ollama" sublabel="LLM Lokal" x={572} y={78} w={98} h={44} color="#1e3a1e" textColor="#86efac" />

        {/* Arrow: Ollama → Response */}
        <Arrow x1={672} y1={100} x2={736} y2={100} active={a1Online} />

        {/* Response */}
        <NodeBox label="Response" sublabel="ke User" x={738} y={78} w={80} h={44} color="#2d4275" textColor="#93c5fd" />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 text-[10px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 2" /></svg>
          <span>Aktif</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#1e2d4a" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
          <span>Tidak aktif / offline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span>Offline</span>
        </div>
      </div>
    </div>
  );
}
