import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678';
  try {
    const formData = await req.formData();
    const res = await fetch(`${url}/webhook/upload-pdf`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Upload gagal — Agent 1 tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
