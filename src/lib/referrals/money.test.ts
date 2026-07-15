import { describe, expect, it } from "vitest";
import {
  availableBalanceMinor,
  decimalToMinorString,
  proportionalReversalMinor,
  splitProfitMinor,
} from "@/lib/referrals/money";

describe("referral money arithmetic", () => {
  it("splits 100.00 profit into an exact 70/30 remainder", () => {
    const result = splitProfitMinor(BigInt(10_000));
    expect(result.subAdminAmountMinor).toBe(BigInt(7_000));
    expect(result.superAdminAmountMinor).toBe(BigInt(3_000));
    expect(result.subAdminAmountMinor + result.superAdminAmountMinor).toBe(
      BigInt(10_000),
    );
  });

  it("keeps odd-cent rounding exact by assigning the remainder to super-admin", () => {
    const result = splitProfitMinor(BigInt(101));
    expect(result.subAdminAmountMinor).toBe(BigInt(70));
    expect(result.superAdminAmountMinor).toBe(BigInt(31));
    expect(result.subAdminAmountMinor + result.superAdminAmountMinor).toBe(
      BigInt(101),
    );
  });

  it("awards no positive commission for zero or negative profit", () => {
    expect(splitProfitMinor(BigInt(0))).toEqual({
      subAdminAmountMinor: BigInt(0),
      superAdminAmountMinor: BigInt(0),
    });
    expect(splitProfitMinor(BigInt(-100))).toEqual({
      subAdminAmountMinor: BigInt(0),
      superAdminAmountMinor: BigInt(0),
    });
  });

  it("creates a proportional partial-refund reversal", () => {
    const result = proportionalReversalMinor({
      originalGrossMinor: BigInt(10_000),
      remainingGrossMinor: BigInt(10_000),
      remainingProfitMinor: BigInt(10_000),
      remainingSubAdminMinor: BigInt(7_000),
      refundMinor: BigInt(2_500),
    });
    expect(result).toEqual({
      refundAppliedMinor: BigInt(2_500),
      profitReversalMinor: BigInt(2_500),
      subAdminReversalMinor: BigInt(1_750),
      superAdminReversalMinor: BigInt(750),
    });
  });

  it("caps a full reversal at the remaining original balances", () => {
    const result = proportionalReversalMinor({
      originalGrossMinor: BigInt(10_000),
      remainingGrossMinor: BigInt(7_500),
      remainingProfitMinor: BigInt(7_500),
      remainingSubAdminMinor: BigInt(5_250),
      refundMinor: BigInt(99_999),
    });
    expect(result.refundAppliedMinor).toBe(BigInt(7_500));
    expect(result.subAdminReversalMinor).toBe(BigInt(5_250));
    expect(result.superAdminReversalMinor).toBe(BigInt(2_250));
  });

  it("parses decimal form values without binary floating point", () => {
    expect(decimalToMinorString("350.00")).toBe("35000");
    expect(decimalToMinorString("0.01")).toBe("1");
    expect(decimalToMinorString("-7.25", { allowNegative: true })).toBe("-725");
    expect(decimalToMinorString("1.999")).toBeNull();
  });

  it("derives outstanding balance from ledger less paid allocations", () => {
    expect(
      availableBalanceMinor({
        availableLedgerMinor: BigInt(12_000),
        paidAllocationsMinor: BigInt(7_000),
      }),
    ).toBe(BigInt(5_000));
  });
});
