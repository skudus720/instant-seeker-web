import { describe, expect, it } from "vitest";
import { isSubscriptionActive } from "@/lib/subscriptions/access";
import {
  getSubscriptionPlan,
  subscriptionPlans,
} from "@/lib/subscriptions/plans";

describe("AI subscription plans", () => {
  it("keeps the configured prices and durations stable", () => {
    expect(
      subscriptionPlans.map(({ code, amountMinor, durationHours }) => ({
        code,
        amountMinor,
        durationHours,
      })),
    ).toEqual([
      { code: "gold", amountMinor: 35_000, durationHours: 24 },
      { code: "platinum", amountMinor: 85_000, durationHours: 48 },
      { code: "diamond", amountMinor: 150_000, durationHours: 72 },
    ]);
    expect(getSubscriptionPlan("platinum")?.popular).toBe(true);
    expect(getSubscriptionPlan("unknown")).toBeNull();
  });

  it("treats only a currently active access window as usable", () => {
    const subscription = {
      id: "subscription-1",
      planCode: "gold" as const,
      status: "active" as const,
      startsAt: "2026-07-11T10:00:00.000Z",
      expiresAt: "2026-07-12T10:00:00.000Z",
    };
    expect(
      isSubscriptionActive(subscription, new Date("2026-07-11T12:00:00.000Z")),
    ).toBe(true);
    expect(
      isSubscriptionActive(subscription, new Date("2026-07-12T10:00:00.000Z")),
    ).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
