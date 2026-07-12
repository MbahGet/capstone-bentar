import { NextRequest, NextResponse } from 'next/server';

// n8n webhook response format: { reply: "...", sessionId: "..." }
// We normalise it to { response, agents_called, sources } for the UI.
export async function POST(req: NextRequest) {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678';
  try {
    const body = await req.json();
    const { message, sessionId, model } = body;
    const chatInput = message || body.chatInput;

    let res = await fetch(`${url}/webhook/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput, sessionId }),
      signal: AbortSignal.timeout(60000),
    });

    if (res.status === 404) {
      res = await fetch(`${url}/webhook/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput, sessionId }),
        signal: AbortSignal.timeout(60000),
      });
    }

    if (res.status === 404) {
      return NextResponse.json(
        {
          error: 'Webhook chat tidak ditemukan (404)',
          details: 'Pastikan workflow n8n sudah di-import dan di-aktifkan (Active) di panel n8n (http://localhost:5678).'
        },
        { status: 404 }
      );
    }

    const text = await res.text();
    let raw: Record<string, unknown>;
    try { raw = JSON.parse(text); } catch { raw = { reply: text }; }

    // Normalise n8n's "reply" field → "response"
    const nestedReply = (raw?.data as Record<string, unknown>)?.reply as string | undefined;
    let responseText = (raw.reply || raw.response || raw.output || nestedReply || 'Tidak ada respons.') as string;

    // Inject full reports if placeholders are present
    if (responseText.includes('[INJECT_REPORT_2]')) {
      try {
        const agent2Url = process.env.AGENT2_URL || 'http://agent2:8000';
        const res2 = await fetch(`${agent2Url}/report_full`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: chatInput, model_preference: 'ollama' }),
        });
        if (res2.ok) {
          responseText = responseText.replace('[INJECT_REPORT_2]', await res2.text());
        } else {
          responseText = responseText.replace('[INJECT_REPORT_2]', 'Pesan sistem: Gagal mengambil laporan penuh dari Agent 2 (status non-200).');
        }
      } catch (err) {
        console.error('Failed to inject Agent 2 report', err);
        responseText = responseText.replace('[INJECT_REPORT_2]', 'Pesan sistem: Gagal mengambil data penuh dari Agent 2.');
      }
    }

    if (responseText.includes('[INJECT_REPORT_3]')) {
      try {
        const agent3Url = process.env.AGENT3_URL || 'http://agent3:9000';
        const res3 = await fetch(`${agent3Url}/report_full`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: chatInput, model_preference: 'ollama' }),
        });
        if (res3.ok) {
          responseText = responseText.replace('[INJECT_REPORT_3]', await res3.text());
        } else {
          responseText = responseText.replace('[INJECT_REPORT_3]', 'Pesan sistem: Gagal mengambil laporan penuh dari Agent 3 (status non-200).');
        }
      } catch (err) {
        console.error('Failed to inject Agent 3 report', err);
        responseText = responseText.replace('[INJECT_REPORT_3]', 'Pesan sistem: Gagal mengambil data penuh dari Agent 3.');
      }
    }

    const normalised = {
      response: responseText,
      agents_called: (raw.agents_called ?? []) as string[],
      sources: (raw.sources ?? []) as string[],
    };

    return NextResponse.json(normalised, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Agent 1 tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
