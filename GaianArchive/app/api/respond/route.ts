import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { apiKey, input, vectorStoreId } = await req.json();
    if (!apiKey || !input || !vectorStoreId) {
      return NextResponse.json({ error: "Missing apiKey/input/vectorStoreId" }, { status: 400 });
    }

    const body = {
      model: "gpt-4.1",
      temperature: 0,
      input,
      tools: [{ type: "file_search" }],
      tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
      tool_choice: { type: "file_search" }
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"   // ensures tool_resources is accepted
      },
      body: JSON.stringify(body)
    });

    const j = await r.json();
    if (!r.ok) return NextResponse.json({ error: j?.error?.message || r.statusText }, { status: r.status });
    return NextResponse.json(j);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
