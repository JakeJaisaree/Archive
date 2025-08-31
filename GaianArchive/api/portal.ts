import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type PortalBody = { customerId?: string };

export async function POST(req: Request) {
  try {
    const { customerId } = (await req.json().catch(() => ({}))) as PortalBody;
    if (!customerId) return new Response("No customerId", { status: 400 });

    if (!process.env.STRIPE_SECRET_KEY) {
      return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
    }

    const origin = process.env.DOMAIN_URL || new URL(req.url).origin;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });

    return Response.json({ url: portal.url });
  } catch (err: any) {
    console.error("Portal error:", err);
    return new Response(err?.message ?? "Portal failed", { status: 500 });
  }
}
