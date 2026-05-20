import { NextResponse } from 'next/server';

export async function POST() {
  const url = process.env.AGENT3_URL ?? 'http://localhost:9000';
  try {
    const res = await fetch(`${url}/test`, {
      method: 'POST',
      signal: AbortSignal.timeout(180000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Test RCA gagal — Agent 3 tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
