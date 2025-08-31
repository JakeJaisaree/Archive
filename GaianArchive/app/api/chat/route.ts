// app/api/chat/route.ts
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

/** Heuristic: did the model include any KB signals (citations/annotations)? */
function usedKB(data: any): boolean {
  if (Array.isArray(data?.output)) {
    for (const m of data.output) {
      if (Array.isArray(m?.content)) {
        for (const part of m.content) {
          if (Array.isArray(part?.annotations) && part.annotations.length) return true;
          if (Array.isArray(part?.citations) && part.citations.length) return true;
          // some SDKs surface file refs like this:
          if (part?.type === "output_text" && Array.isArray(part?.citations) && part.citations.length) return true;
        }
      }
    }
  }
  return false;
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

  const body = {
    model: "gpt-5-mini",
    temperature: 0,
    input: userQuestion,                       
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [VECTOR_STORE_ID],    
      },
    },
    tool_choice: { type: "file_search" },           
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || res.statusText);
  return extractAnswer(data);
}




