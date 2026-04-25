import type { PublicPlan } from "@/hooks/use-public-plans";

function hasPositivePrice(plan: PublicPlan) {
  return (plan.priceMonthlyCents ?? plan.priceYearlyCents ?? 0) > 0;
}

function isMpesaCheckoutPlan(plan: PublicPlan) {
  return (
    (plan.currency || "").toLowerCase() === "mzn" &&
    (plan.ctaType ?? "checkout") === "checkout" &&
    hasPositivePrice(plan)
  );
}

export function selectMpesaCreditPlan(plans: PublicPlan[] | undefined | null) {
  if (!plans?.length) return null;
  return plans.find(isMpesaCheckoutPlan) ?? null;
}

