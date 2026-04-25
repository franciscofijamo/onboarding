import { describe, expect, it } from "vitest";
import { selectMpesaCreditPlan } from "@/lib/billing/select-mpesa-plan";
import type { PublicPlan } from "@/hooks/use-public-plans";

function makePlan(overrides: Partial<PublicPlan>): PublicPlan {
  return {
    id: overrides.id ?? "plan",
    name: overrides.name ?? "Plan",
    credits: overrides.credits ?? 100,
    currency: overrides.currency ?? "mzn",
    priceMonthlyCents: overrides.priceMonthlyCents ?? 10000,
    priceYearlyCents: overrides.priceYearlyCents ?? null,
    ctaType: overrides.ctaType ?? "checkout",
    ...overrides,
  };
}

describe("selectMpesaCreditPlan", () => {
  it("returns the first eligible M-Pesa checkout plan", () => {
    const plan = selectMpesaCreditPlan([
      makePlan({ id: "brl", currency: "brl" }),
      makePlan({ id: "mzn-first", currency: "mzn" }),
      makePlan({ id: "mzn-second", currency: "mzn" }),
    ]);

    expect(plan?.id).toBe("mzn-first");
  });

  it("ignores contact-only and free MZN plans", () => {
    const plan = selectMpesaCreditPlan([
      makePlan({ id: "contact", currency: "mzn", ctaType: "contact" }),
      makePlan({ id: "free", currency: "mzn", priceMonthlyCents: 0, priceYearlyCents: 0 }),
      makePlan({ id: "valid", currency: "mzn", priceMonthlyCents: 25000 }),
    ]);

    expect(plan?.id).toBe("valid");
  });

  it("returns null when no eligible M-Pesa plan exists", () => {
    const plan = selectMpesaCreditPlan([
      makePlan({ id: "brl", currency: "brl" }),
      makePlan({ id: "contact", currency: "mzn", ctaType: "contact" }),
    ]);

    expect(plan).toBeNull();
  });
});
