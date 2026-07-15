import { describe, expect, it } from "vitest";
import {
  referralAdjustmentSchema,
  referralPayoutCancellationSchema,
  referralPayoutSchema,
} from "@/lib/referrals/validation";

const referralProfileId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

describe("referral financial validation", () => {
  it("converts a valid payout to exact integer minor units", () => {
    const result = referralPayoutSchema.parse({
      referralProfileId,
      currency: "GHS",
      amount: "125.07",
      paymentMethod: "Mobile Money",
      externalReference: "MOMO-12507",
      notes: "Externally confirmed",
      payoutDate: "2026-07-11T10:30",
      reason: "Verified external transfer",
      returnTo: `/admin/referrals/${referralProfileId}`,
    });
    expect(result.amount).toBe("12507");
  });

  it("rejects zero, negative, and over-precise payouts", () => {
    for (const amount of ["0", "-1.00", "1.001"]) {
      expect(
        referralPayoutSchema.safeParse({
          referralProfileId,
          currency: "GHS",
          amount,
          paymentMethod: "Mobile Money",
          externalReference: "MOMO-INVALID",
          payoutDate: "2026-07-11T10:30",
          reason: "Invalid amount check",
          returnTo: "/admin/referrals",
        }).success,
      ).toBe(false);
    }
  });

  it("requires an audited reason for adjustments and cancellations", () => {
    expect(
      referralAdjustmentSchema.safeParse({
        referralProfileId,
        currency: "GHS",
        amount: "-10.00",
        reason: "short",
        returnTo: "/admin/referrals",
      }).success,
    ).toBe(true);
    expect(
      referralPayoutCancellationSchema.safeParse({
        payoutId: referralProfileId,
        reason: "no",
        returnTo: "/admin/referrals",
      }).success,
    ).toBe(false);
  });
});
