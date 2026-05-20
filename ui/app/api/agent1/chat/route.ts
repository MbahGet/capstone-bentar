import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678';
  try {
    const body = await req.json();
    const res = await fetch(`${url}/webhook/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Agent 1 tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
