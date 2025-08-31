import { NextResponse } from "next/server";
import { readKB, writeKB } from "@/lib/kb";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password, key, value } = await req.json().catch(() => ({}));

  if (password !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!key || typeof value === "undefined") {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  const kb = await readKB();
  (kb as any)[key] = value;
  await writeKB(kb);

  return NextResponse.json({ ok: true });
}
