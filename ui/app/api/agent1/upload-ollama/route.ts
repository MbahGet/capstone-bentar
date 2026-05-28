import { NextRequest, NextResponse } from 'next/server';

// n8n webhook path is /webhook/upload-ollama
export async function POST(req: NextRequest) {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678'; // use 5678 default to match env config
  try {
    const formData = await req.formData();
    const res = await fetch(`${url}/webhook/upload-ollama`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000),
    });
    // n8n may respond with non-JSON on success — handle both
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { success: true, raw: text }; }
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Upload gagal — Agent 1 (Ollama) tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
