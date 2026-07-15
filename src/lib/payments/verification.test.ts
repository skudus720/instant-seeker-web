import { describe, expect, it } from "vitest";
import {
  parseAcceptedDispute,
  parseProcessedRefund,
  parseVerifiedSignupPayment,
  parseVerifiedSubscriptionPayment,
} from "@/lib/payments/verification";

const userId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

describe("signup payment verification", () => {
  it("accepts only the configured successful signup payment", () => {
    const result = parseVerifiedSignupPayment(
      {
        status: "success",
        reference: "is-payment-123",
        amount: 5000,
        currency: "GHS",
        paid_at: "2026-07-11T12:00:00.000Z",
        metadata: JSON.stringify({
          purpose: "instant_seeker_signup",
          user_id: userId,
        }),
      },
      "is-payment-123",
    );

    expect(result).toEqual({
      userId,
      reference: "is-payment-123",
      amountMinor: 5000,
      currency: "GHS",
      paidAt: "2026-07-11T12:00:00.000Z",
    });
  });

  it("rejects wrong amounts, references, and unrelated metadata", () => {
    const base = {
      status: "success",
      reference: "expected",
      amount: 5000,
      currency: "GHS",
      paid_at: "2026-07-11T12:00:00.000Z",
      metadata: {
        purpose: "instant_seeker_signup",
        user_id: userId,
      },
    };

    expect(
      parseVerifiedSignupPayment({ ...base, amount: 4900 }, "expected"),
    ).toBeNull();
    expect(parseVerifiedSignupPayment(base, "different")).toBeNull();
    expect(
      parseVerifiedSignupPayment({
        ...base,
        metadata: { ...base.metadata, purpose: "other" },
      }),
    ).toBeNull();
    expect(parseVerifiedSignupPayment({ ...base, paid_at: null })).toBeNull();
  });
});

describe("AI subscription payment verification", () => {
  const base = {
    status: "success",
    reference: "is-plan-123",
    amount: 85_000,
    currency: "GHS",
    paid_at: "2026-07-11T14:00:00.000Z",
    metadata: {
      purpose: "instant_seeker_ai_subscription",
      user_id: userId,
      plan_code: "platinum",
    },
  };

  it("accepts a verified transaction that exactly matches the plan", () => {
    expect(parseVerifiedSubscriptionPayment(base, "is-plan-123")).toEqual({
      userId,
      planCode: "platinum",
      reference: "is-plan-123",
      amountMinor: 85_000,
      currency: "GHS",
      paidAt: "2026-07-11T14:00:00.000Z",
    });
  });

  it("rejects altered plan amounts, unknown plans, and wrong purposes", () => {
    expect(
      parseVerifiedSubscriptionPayment({ ...base, amount: 35_000 }),
    ).toBeNull();
    expect(
      parseVerifiedSubscriptionPayment({
        ...base,
        metadata: { ...base.metadata, plan_code: "vip" },
      }),
    ).toBeNull();
    expect(
      parseVerifiedSubscriptionPayment({
        ...base,
        metadata: { ...base.metadata, purpose: "other" },
      }),
    ).toBeNull();
  });
});

describe("payment reversal verification", () => {
  it("parses a processed Paystack refund in minor units", () => {
    expect(
      parseProcessedRefund({
        status: "processed",
        transaction_reference: "payment-ref-1",
        refund_reference: "refund-ref-1",
        amount: "2500",
        currency: "GHS",
      }),
    ).toEqual({
      paymentReference: "payment-ref-1",
      amountMinor: 2500,
      currency: "GHS",
      providerRecordId: "refund-ref-1",
    });
  });

  it("rejects pending refunds because they are not final", () => {
    expect(
      parseProcessedRefund({
        status: "pending",
        transaction_reference: "payment-ref-1",
        amount: "2500",
        currency: "GHS",
      }),
    ).toBeNull();
  });

  it("parses a resolved merchant-accepted chargeback", () => {
    expect(
      parseAcceptedDispute({
        id: 99,
        refund_amount: 5000,
        currency: "GHS",
        resolution: "merchant-accepted",
        transaction: { reference: "payment-ref-2", amount: 5000 },
      }),
    ).toEqual({
      paymentReference: "payment-ref-2",
      amountMinor: 5000,
      currency: "GHS",
      providerRecordId: "99",
    });
  });

  it("does not reverse a declined or newly opened dispute", () => {
    expect(
      parseAcceptedDispute({
        id: 99,
        refund_amount: 5000,
        currency: "GHS",
        resolution: "declined",
        transaction: { reference: "payment-ref-2" },
      }),
    ).toBeNull();
    expect(
      parseAcceptedDispute({
        id: 100,
        amount: 5000,
        currency: "GHS",
        transaction: { reference: "payment-ref-2" },
      }),
    ).toBeNull();
  });
});
