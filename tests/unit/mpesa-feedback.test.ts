import { describe, expect, it } from "vitest";
import { isLikelyMpesaDismissal } from "@/lib/billing/mpesa-feedback";

describe("isLikelyMpesaDismissal", () => {
  it("detects dismissal-like provider messages", () => {
    expect(
      isLikelyMpesaDismissal({ error: "Payment request dismissed by user" })
    ).toBe(true);
    expect(
      isLikelyMpesaDismissal({ error: "Transaction was cancelled" })
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(
      isLikelyMpesaDismissal({ error: "Invalid Vodacom number", code: "ERROR" })
    ).toBe(false);
  });
});
