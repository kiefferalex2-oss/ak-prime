import Stripe from "npm:stripe@22.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const stripeKey = Deno.env.get("STRIPE_LIVE_SECRET_KEY") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const allowedOrigins = new Set(["https://akprime.fr", "https://www.akprime.fr"]);
const offers = new Set(["forme_standard", "forme_renforce", "performance_p1", "performance_p2", "performance_p3", "mental_particulier", "mental_sportif"]);

function response(status: number, body: Record<string, unknown>, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "content-type,apikey",
    },
  });
}
const objectId = (value: unknown): string | null =>
  typeof value === "string" ? value : (value && typeof value === "object" && "id" in value) ? String((value as {id:string}).id) : null;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", {status:403, headers:{"Cache-Control":"no-store"}});
  if (req.method === "OPTIONS") return response(200, {}, origin);
  if (req.method !== "POST") return response(405, {state:"unavailable"}, origin);
  if (!stripeKey.startsWith("sk_live_") && !stripeKey.startsWith("rk_live_")) return response(503, {state:"unavailable"}, origin);
  if (!supabaseUrl || !serviceKey) return response(503, {state:"unavailable"}, origin);

  let sessionId = "";
  try {
    const payload = await req.json();
    sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";
  } catch {
    return response(400, {state:"invalid"}, origin);
  }
  // Stripe Checkout session IDs are opaque: never expose or log them.
  if (!/^cs_live_[A-Za-z0-9_]{15,220}$/.test(sessionId)) return response(400, {state:"invalid"}, origin);

  try {
    const admin = createClient(supabaseUrl, serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
    // Look up a session in our own live orders BEFORE querying Stripe.
    const result = await admin.from("stripe_live_checkout_orders")
      .select("id,offer_code,commitment_months,payment_mode,status,paid_at,stripe_session_id,stripe_customer_id,monthly_cents,total_cents,stripe_amount_paid_cents")
      .eq("stripe_session_id", sessionId).maybeSingle();
    if (result.error) return response(503, {state:"unavailable"}, origin);
    const order = result.data;
    if (!order) return response(404, {state:"not_found"}, origin);
    // Only a paid/provisioned order confirmed through the existing Stripe webhook qualifies.
    if (!["paid","provisioned"].includes(order.status) || !order.paid_at) return response(202, {state:"pending"}, origin);
    if (!offers.has(order.offer_code) || ![3,6].includes(order.commitment_months)) return response(409, {state:"invalid"}, origin);

    const amount = order.payment_mode === "monthly" ? order.monthly_cents : order.total_cents;
    if (!Number.isInteger(amount) || amount <= 0 || order.stripe_amount_paid_cents !== amount)
      return response(409, {state:"invalid"}, origin);

    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.livemode !== true ||
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      session.id !== order.stripe_session_id ||
      session.client_reference_id !== order.id ||
      session.metadata?.akprime_live_order_id !== order.id ||
      objectId(session.customer) !== order.stripe_customer_id ||
      session.currency !== "eur" ||
      session.amount_total !== amount ||
      session.mode !== (order.payment_mode === "monthly" ? "subscription" : "payment")
    ) return response(409, {state:"invalid"}, origin);

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("akp-verified-sale-v1|" + order.id));
    const token = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("").slice(0,32);
    const value = Math.round(amount) / 100;
    // Opaque transaction identifier and public catalog code only. No PII or sensitive client fields.
    return response(200, {
      state:"confirmed",
      transaction_id:"akp-" + token,
      currency:"EUR",
      value,
      offer_code:order.offer_code
    }, origin);
  } catch {
    return response(503, {state:"unavailable"}, origin);
  }
});
