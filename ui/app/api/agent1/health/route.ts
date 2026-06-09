import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678';
  const start = Date.now();
  try {
    const res = await fetch(`${url}/healthz`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return NextResponse.json({ status: 'online', latency, data });
  } catch (e) {
    return NextResponse.json(
      { status: 'offline', latency: Date.now() - start, error: String(e) },
      { status: 503 }
    );
  }
}