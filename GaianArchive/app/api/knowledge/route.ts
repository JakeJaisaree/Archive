import { NextResponse } from "next/server";
import { readKBInfo, readKBPreview } from "@/lib/kb";

export const runtime = "nodejs";

export async function GET() {
  const info = await readKBInfo();
  const preview = await readKBPreview().catch(() => "");
  return NextResponse.json({ info, preview });
}
