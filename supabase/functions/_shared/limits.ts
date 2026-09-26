import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type Plan } from "../../../packages/shared/src/index.ts";

export type UsageKind = "product" | "ai_scene";

/** Free plan limits are lifetime; paid plans reset each calendar month (UTC). */
export async function remaining(admin: SupabaseClient, userId: string, kind: UsageKind): Promise<number> {
  const { data: profile, error } = await admin.from("profiles").select("plan, plan_expires_at").eq("id", userId).single();
  if (error) throw error;

  const expired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date();
  const plan: Plan = expired ? "free" : profile.plan;
  const limit = kind === "product" ? PLAN_LIMITS[plan].products : PLAN_LIMITS[plan].aiScenes;

  let query = admin.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", kind);
  if (plan !== "free") {
    const now = new Date();
    query = query.gte("created_at", new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString());
  }
  const { count, error: countError } = await query;
  if (countError) throw countError;
  return limit - (count ?? 0);
}
