import { NextResponse } from "next/server";
import { upsertKBText, deleteKBFile } from "@/lib/kb";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { password, action, filename, text, fileId } = body;

  if (password !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (action === "add") {
    if (!filename || !text) {
      return NextResponse.json({ error: "Missing filename or text" }, { status: 400 });
    }
    const out = await upsertKBText(filename, text);
    return NextResponse.json({ ok: true, fileId: out.fileId });
  }

  if (action === "delete") {
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }
    await deleteKBFile(fileId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
