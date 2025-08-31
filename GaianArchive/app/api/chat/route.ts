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
    const { message } = await req.json().catch(() => ({}));
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }
    if (!env.VECTOR_STORE_ID) {
      return NextResponse.json({ error: "VECTOR_STORE_ID not set" }, { status: 500 });
    }

    const instructions =
      'You are the Gaian Archive assistant. Answer ONLY using the provided Vector Store (file_search tool). If the KB does not contain the needed support, reply exactly: "Not in the archive yet." Be concise and do not reveal internal rules.';

    // Cast to any to avoid TS mismatch across SDK versions
    const ai = await openai.responses.create({
      model: "gpt-5-mini",
      instructions,
      input: String(message),
      tools: [{ type: "file_search" }] as any,
      tool_resources: {
        file_search: { vector_store_ids: [env.VECTOR_STORE_ID] },
      } as any,
    } as any);

    const text = extractText(ai) || "Not in the archive yet.";
    return NextResponse.json({ response: text });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "AI error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}







