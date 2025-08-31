import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

function extractText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();

  if (Array.isArray(data?.output)) {
    const out: string[] = [];
    for (const m of data.output) {
      if (m?.type === "message" && Array.isArray(m.content)) {
        for (const part of m.content) {
          const t = part?.text ?? part?.output_text ?? part?.input_text;
          if (typeof t === "string") out.push(t);
        }
      }
    }
    if (out.length) return out.join("").trim();
  }

  const c = data?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c.trim() : "";
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Optional runtime guard (nice for clearer errors in prod)
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }
    if (!env.VECTOR_STORE_ID) {
      return NextResponse.json({ error: "VECTOR_STORE_ID missing" }, { status: 500 });
    }

    const resp = await openai.responses.create({
      model: env.OPENAI_MODEL, 
      temperature: 0,
      input: String(message),
      tools: [{ type: "file_search" as const }],
      tool_resources: {
        file_search: { vector_store_ids: [env.VECTOR_STORE_ID] }, // now definitely string[]
      },
    });

    const text = extractText(resp);
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
