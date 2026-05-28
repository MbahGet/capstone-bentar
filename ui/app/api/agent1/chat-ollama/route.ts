import { NextRequest, NextResponse } from 'next/server';

// n8n webhook response format: { reply: "...", sessionId: "..." }
// We normalise it to { response, agents_called, sources } for the UI.
export async function POST(req: NextRequest) {
  const url = process.env.AGENT1_URL ?? 'http://localhost:5678';
  try {
    const body = await req.json();
    const res = await fetch(`${url}/webhook/chat-ollama`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    const text = await res.text();
    let raw: Record<string, unknown>;
    try { raw = JSON.parse(text); } catch { raw = { reply: text }; }

    // Normalise n8n's "reply" field → "response"
    const normalised = {
      response: (raw.reply || raw.response || raw.output || 'Tidak ada respons.') as string,
      agents_called: (raw.agents_called ?? []) as string[],
      sources: (raw.sources ?? []) as string[],
    };

    return NextResponse.json(normalised, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'Agent 1 (Ollama) tidak dapat dijangkau', details: String(e) },
      { status: 503 }
    );
  }
}
