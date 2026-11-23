import { describe, it, expect } from "vitest";
import { unlockStateForSubscriptionStatus } from "../src/fast-track/subscription.js";

describe("Family pass subscription access", () => {
  it("grants access while the subscription is paid", () => {
    expect(unlockStateForSubscriptionStatus("active")).toBe(true);
    expect(unlockStateForSubscriptionStatus("trialing")).toBe(true);
  });

  it("removes access once the subscription has ended or is unpaid", () => {
    expect(unlockStateForSubscriptionStatus("canceled")).toBe(false);
    expect(unlockStateForSubscriptionStatus("unpaid")).toBe(false);
    expect(unlockStateForSubscriptionStatus("incomplete_expired")).toBe(false);
  });

  it("leaves access unchanged while a failed payment is being retried", () => {
    expect(unlockStateForSubscriptionStatus("past_due")).toBeNull();
    expect(unlockStateForSubscriptionStatus("incomplete")).toBeNull();
    expect(unlockStateForSubscriptionStatus("paused")).toBeNull();
  });
});
