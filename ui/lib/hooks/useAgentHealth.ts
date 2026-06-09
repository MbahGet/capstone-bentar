'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgentHealth } from '@/lib/types';
import { checkHealth } from '@/lib/api';

type AgentKey = 'agent1' | 'agent2' | 'agent3';

const AGENTS: AgentKey[] = ['agent1', 'agent2', 'agent3'];

const INITIAL_HEALTH: Record<string, AgentHealth> = {
  agent1: { status: 'unknown', latency: null, lastCheck: null },
  agent2: { status: 'unknown', latency: null, lastCheck: null },
  agent3: { status: 'unknown', latency: null, lastCheck: null },
};

export function useAgentHealth(intervalMs = 30_000) {
  const [health, setHealth] = useState<Record<string, AgentHealth>>(INITIAL_HEALTH);

  const poll = useCallback(async () => {
    const results = await Promise.allSettled(AGENTS.map((a) => checkHealth(a)));
    const now = new Date();
    const next: Record<string, AgentHealth> = {};
    results.forEach((r, i) => {
      next[AGENTS[i]] =
        r.status === 'fulfilled'
          ? {
              status: r.value.status as AgentHealth['status'],
              latency: r.value.latency,
              lastCheck: now,
              error: r.value.error,
            }
          : { status: 'offline', latency: null, lastCheck: now, error: 'Check failed' };
    });
    setHealth(next);
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, intervalMs]);

  return health;
}