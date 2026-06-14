import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.AGENT3_URL ?? 'http://localhost:9000';
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    const data = await res.json();
    return NextResponse.json({ status: 'online', latency, data });
  } catch (e) {
    return NextResponse.json(
      { status: 'offline', latency: Date.now() - start, error: String(e) },
      { status: 503 }
    );
  }
}
