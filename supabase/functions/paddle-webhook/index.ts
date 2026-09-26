/**
 * Paddle Billing webhook -> profiles.plan.
 * Web checkout must pass customData: { user_id: <supabase user id> }.
 * Signature: Paddle-Signature "ts=...;h1=..." = HMAC-SHA256(secret, `${ts}:${rawBody}`).
 */
import { adminClient } from "../_shared/supabase.ts";
import { json, safeEqual } from "../_shared/http.ts";
import { planForProduct, setPlan } from "../_shared/plans.ts";

const MAX_SKEW_SECONDS = 300;

async function verify(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=", 2) as [string, string]));
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1 || Math.abs(Date.now() / 1000 - Number(ts)) > MAX_SKEW_SECONDS) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return safeEqual(hex, h1);
}

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("Paddle-Signature"), Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? ""))) {
    return json({ error: "unauthorized" }, 401);
  }

  const { event_type, data } = JSON.parse(raw);
  if (!String(event_type).startsWith("subscription.")) return json({ ok: true, skipped: event_type });

  const userId: string | undefined = data?.custom_data?.user_id;
  if (!userId) return json({ error: "missing custom_data.user_id" }, 422);

  const admin = adminClient();
  if (data.status === "active" || data.status === "trialing") {
    const priceId: string | undefined = data.items?.[0]?.price?.id;
    const plan = planForProduct(priceId);
    if (!plan) return json({ error: `unknown price ${priceId}` }, 422);
    const periodEnd = data.current_billing_period?.ends_at;
    await setPlan(admin, userId, plan, "paddle", periodEnd ? new Date(periodEnd) : null);
  } else if (data.status === "canceled") {
    await setPlan(admin, userId, "free", "paddle", null);
  }
  // past_due / paused: keep plan until plan_expires_at passes (limits.ts treats expired as free).
  return json({ ok: true });
});
