export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: 'csv' | 'pdf';
  file?: File;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentsCalled?: string[];
  sources?: string[];
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  attachments?: FileAttachment[];
  kpiResult?: KPIResult;
  rcaResult?: RCAResult;
  pipelineStatus?: string;
}

export interface KPISummary {
  avg_oee: number;
  avg_downtime_rate: number;
  avg_defect_rate: number;
  total_downtime_min: number;
  total_production_units: number;
  total_defect_units: number;
}

export interface Alert {
  metric: string;
  level: 'high' | 'medium' | 'low';
  message: string;
}

export interface Deviation {
  date: string;
  machine_id: string;
  oee: number;
  downtime_rate: number;
  defect_rate: number;
  deviation_probability: number;
  deviation_flag: number;
}

export interface KPIResult {
  summary: KPISummary;
  alerts: Alert[];
  model_metrics: {
    deviation_count: number;
    deviation_ratio: number;
    max_deviation_probability: number;
  };
  top_deviations: Deviation[];
  recommendation: {
    source: string;
    model?: string;
    text: string;
  };
}

export interface RootCause {
  rank: number;
  feature: string;
  importance_score: number;
}

export interface RCAResult {
  status: string;
  message?: string;
  summary: {
    total_records_analyzed: number;
    defect_incidents_detected: number;
    defect_rate_percentage: number;
  };
  root_causes: RootCause[];
  explanation: string;
  feature_importance?: RootCause[];
  artifacts?: Record<string, string>;
}

export type AgentStatus = 'online' | 'offline' | 'checking' | 'unknown';

export interface AgentHealth {
  status: AgentStatus;
  latency: number | null;
  lastCheck: Date | null;
  details?: Record<string, unknown>;
  error?: string;
}

export interface LogEntry {
  id: string;
  agent: 'agent1' | 'agent2' | 'agent3';
  method: string;
  endpoint: string;
  statusCode: number | null;
  latency: number | null;
  timestamp: Date;
  error?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'csv';
  uploadedAt: Date;
  status: 'uploading' | 'done' | 'error';
}