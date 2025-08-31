import { NextResponse } from "next/server";
import { readKB } from "@/lib/kb";

export const runtime = "nodejs";

export async function GET() {
  const kb = await readKB();
  return NextResponse.json({ count: Object.keys(kb).length, data: kb });
}
