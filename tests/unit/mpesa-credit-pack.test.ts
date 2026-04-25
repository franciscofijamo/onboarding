import { describe, expect, it } from "vitest";
import {
  getMpesaCreditPackConfig,
  getMpesaCreditPackPlan,
  isMpesaCreditPackPlanId,
} from "@/lib/billing/mpesa-credit-pack";

describe("mpesa credit pack fallback", () => {
  it("provides a valid default fallback plan", () => {
    const config = getMpesaCreditPackConfig();
    const plan = getMpesaCreditPackPlan();

    expect(plan.id).toBe(config.id);
    expect(plan.currency).toBe("mzn");
    expect(plan.priceMonthlyCents).toBe(config.priceMonthlyCents);
    expect(plan.credits).toBeGreaterThan(0);
    expect(plan.ctaType).toBe("checkout");
  });

  it("recognizes the fallback plan id", () => {
    const config = getMpesaCreditPackConfig();

    expect(isMpesaCreditPackPlanId(config.id)).toBe(true);
    expect(isMpesaCreditPackPlanId("other-plan")).toBe(false);
  });
});
