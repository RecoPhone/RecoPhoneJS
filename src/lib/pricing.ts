// src/lib/pricing.ts
export type PlanKey = "essentiel" | "familial" | "zen";

export const PRICE_IDS: Record<PlanKey, string> = {
  essentiel: process.env.STRIPE_PRICE_ESSENTIEL ?? "",
  familial: process.env.STRIPE_PRICE_FAMILIAL ?? "",
  zen: process.env.STRIPE_PRICE_ZEN ?? "",
};
