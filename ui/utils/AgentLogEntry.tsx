export interface AgentLogEntry {
  id: string;
  agent: 'agent1' | 'agent2' | 'agent3';
  method: string;
  endpoint: string;
  statusCode: number | null;
  latency: number | null;
  timestamp: Date;
  error?: string;
  detail?: unknown;
}