export const PLANS = ["free", "starter", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanLimits {
  /** Products (text + white-background photo) per month; free is lifetime. */
  products: number;
  /** AI studio scenes per month (costly, ~$0.10 each). */
  aiScenes: number;
  priceUsd: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { products: 5, aiScenes: 2, priceUsd: 0 },
  starter: { products: 50, aiScenes: 10, priceUsd: 9 },
  pro: { products: 200, aiScenes: 50, priceUsd: 19 },
};
