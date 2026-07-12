import { NextRequest, NextResponse } from 'next/server';

// n8n webhook path is /webhook/upload (not /webhook/upload-pdf)
export async function POST(req: NextRequest) {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678';
  try {
    const formData = await req.formData();
    let res = await fetch(`${url}/webhook/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (res.status === 404) {
      res = await fetch(`${url}/webhook/upload-ollama`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000),
      });
    }

    if (res.status === 404) {
      return NextResponse.json(
        {
          error: 'Webhook upload tidak ditemukan (404)',
          details: 'Pastikan workflow n8n sudah di-import dan di-aktifkan (Active) di panel n8n (http://localhost:5678).'
        },
        { status: 404 }
      );
    }
    // n8n may respond with non-JSON on success — handle both
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { success: true, raw: text }; }
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Upload gagal — Agent 1 tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
