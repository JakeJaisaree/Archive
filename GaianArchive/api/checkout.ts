import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secret = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(secret!, {});

type CheckoutBody = {
  priceId?: string;
  successPath?: string; // e.g. "/account"
  cancelPath?: string;  // e.g. "/pricing"
  customerId?: string;  // optional
};

export async function POST(req: Request) {
  try {
    if (!secret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as CheckoutBody;
    const priceId = body.priceId;
    const successPath = body.successPath ?? "/account";
    const cancelPath = body.cancelPath ?? "/pricing";

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const origin = process.env.DOMAIN_URL || new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      customer: body.customerId, // optional
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Checkout failed" }, { status: 500 });
  }
}
