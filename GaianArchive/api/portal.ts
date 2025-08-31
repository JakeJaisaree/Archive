import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secret = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(secret!, {});

type PortalBody = { customerId?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as PortalBody;

    if (!secret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }
    if (!body.customerId) {
      return NextResponse.json({ error: "No customerId" }, { status: 400 });
    }

    const origin = process.env.DOMAIN_URL || new URL(req.url).origin;

    const portal = await stripe.billingPortal.sessions.create({
      customer: body.customerId,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portal.url }, { status: 200 });
  } catch (err: any) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: err?.message ?? "Portal failed" }, { status: 500 });
  }
}
