import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type Plan } from "../../../packages/shared/src/index.ts";

/**
 * Maps store product / price ids to plans, e.g.
 *   PLAN_PRODUCT_MAP='{"studio_starter_monthly":"starter","pri_01abc":"pro"}'
 */
export function planForProduct(productId: string | undefined): Plan | null {
  if (!productId) return null;
  const map = JSON.parse(Deno.env.get("PLAN_PRODUCT_MAP") ?? "{}") as Record<string, string>;
  const plan = map[productId];
  return plan && (PLANS as readonly string[]).includes(plan) ? (plan as Plan) : null;
}

export async function setPlan(
  admin: SupabaseClient,
  userId: string,
  plan: Plan,
  source: "revenuecat" | "paddle",
  expiresAt: Date | null,
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ plan, plan_source: plan === "free" ? null : source, plan_expires_at: expiresAt?.toISOString() ?? null })
    .eq("id", userId);
  if (error) throw error;
}
