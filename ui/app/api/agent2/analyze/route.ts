import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = process.env.AGENT2_URL ?? 'http://localhost:8000';
  try {
    const formData = await req.formData();
    /* model_preference is already in formData — forwarded as-is to the agent */
    const res = await fetch(`${url}/analyze`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Analisis KPI gagal — Agent 2 tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
