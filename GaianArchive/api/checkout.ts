// app/api/checkout/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ensure no prerendering

// Use account default API version (safest); remove apiVersion pin to avoid mismatches.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CheckoutBody = {
  priceId?: string;
  successPath?: string; // e.g. "/account"
  cancelPath?: string;  // e.g. "/pricing"
  customerId?: string;  // optional: if you already have a Stripe customer
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CheckoutBody;

    const priceId =
      typeof body.priceId === "string"
        ? body.priceId
        : process.env.STRIPE_PRICE_ID_PRO;

    if (!process.env.STRIPE_SECRET_KEY) {
      return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
    }
    if (!priceId) {
      return new Response("Missing priceId (or STRIPE_PRICE_ID_PRO)", {
        status: 400,
      });
    }

    const origin = process.env.DOMAIN_URL || new URL(req.url).origin;
    const successPath = body.successPath ?? "/account";
    const cancelPath = body.cancelPath ?? "/pricing";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      customer: body.customerId, // optional
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}`,
    });

    return Response.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return new Response(err?.message ?? "Checkout failed", { status: 500 });
  }
}
