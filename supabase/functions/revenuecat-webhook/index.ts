/**
 * RevenueCat webhook -> profiles.plan.
 * In the iOS app call Purchases.logIn(<supabase user id>) so app_user_id is our user id.
 * Dashboard: set the webhook Authorization header to REVENUECAT_WEBHOOK_SECRET.
 */
import { adminClient } from "../_shared/supabase.ts";
import { json, safeEqual } from "../_shared/http.ts";
import { planForProduct, setPlan } from "../_shared/plans.ts";

const ACTIVE_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "SUBSCRIPTION_EXTENDED"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";
  if (!secret || !safeEqual(req.headers.get("Authorization") ?? "", secret)) return json({ error: "unauthorized" }, 401);

  const { event } = await req.json();
  const userId: string | undefined = event?.app_user_id;
  if (!userId || !UUID.test(userId)) return json({ ok: true, skipped: "anonymous user" });

  const admin = adminClient();
  if (ACTIVE_EVENTS.has(event.type)) {
    const productId = event.type === "PRODUCT_CHANGE" ? event.new_product_id ?? event.product_id : event.product_id;
    const plan = planForProduct(productId);
    if (!plan) return json({ error: `unknown product ${productId}` }, 422);
    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    await setPlan(admin, userId, plan, "revenuecat", expiresAt);
  } else if (event.type === "EXPIRATION") {
    await setPlan(admin, userId, "free", "revenuecat", null);
  }
  // CANCELLATION = auto-renew turned off; access stays until expiration, nothing to do.
  return json({ ok: true });
});
