import type { PublicPlan } from "@/hooks/use-public-plans";

const DEFAULT_MPESA_CREDIT_PACK_ID = "mpesa-credit-pack";
const DEFAULT_MPESA_CREDIT_PACK_NAME = "M-Pesa Credit Pack";
const DEFAULT_MPESA_CREDIT_PACK_CREDITS = 100;
const DEFAULT_MPESA_CREDIT_PACK_PRICE_MZN = 100;

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMpesaCreditPackConfig() {
  const credits = toPositiveInt(
    process.env.MPESA_CREDIT_PACK_CREDITS,
    DEFAULT_MPESA_CREDIT_PACK_CREDITS
  );
  const priceMzn = toPositiveInt(
    process.env.MPESA_CREDIT_PACK_PRICE_MZN,
    DEFAULT_MPESA_CREDIT_PACK_PRICE_MZN
  );

  return {
    id: process.env.MPESA_CREDIT_PACK_ID || DEFAULT_MPESA_CREDIT_PACK_ID,
    name: process.env.MPESA_CREDIT_PACK_NAME || DEFAULT_MPESA_CREDIT_PACK_NAME,
    credits,
    priceMzn,
    priceMonthlyCents: priceMzn * 100,
  };
}

export function getMpesaCreditPackPlan(): PublicPlan {
  const config = getMpesaCreditPackConfig();

  return {
    id: config.id,
    name: config.name,
    credits: config.credits,
    currency: "mzn",
    priceMonthlyCents: config.priceMonthlyCents,
    priceYearlyCents: null,
    description: "Instant credit top-up via M-Pesa.",
    ctaType: "checkout",
    ctaLabel: "Buy now",
    billingSource: "manual",
    badge: "M-Pesa",
    highlight: true,
    features: null,
    clerkId: null,
    ctaUrl: null,
  };
}

export function isMpesaCreditPackPlanId(planId: string) {
  return planId === getMpesaCreditPackConfig().id;
}
