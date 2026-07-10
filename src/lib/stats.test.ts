import { describe, expect, it } from "vitest";
import { calculateVerifiedStats } from "@/lib/stats";

describe("verified public statistics", () => {
  it("counts only verified wins in the requested currency and approved reviews", () => {
    const stats = calculateVerifiedStats(
      [
        {
          userId: "one",
          amount: 100,
          currency: "GHS",
          verificationStatus: "verified",
        },
        {
          userId: "one",
          amount: 50,
          currency: "GHS",
          verificationStatus: "verified",
        },
        {
          userId: "two",
          amount: 9999,
          currency: "GHS",
          verificationStatus: "pending",
        },
        {
          userId: "three",
          amount: 20,
          currency: "USD",
          verificationStatus: "verified",
        },
      ],
      12,
      [
        { rating: 5, moderationStatus: "approved" },
        { rating: 1, moderationStatus: "pending" },
        { rating: 3, moderationStatus: "approved" },
      ],
      "GHS",
    );
    expect(stats.verifiedWinners).toBe(1);
    expect(stats.totalVerifiedAmountWon).toBe(150);
    expect(stats.screenshotsAnalyzed).toBe(12);
    expect(stats.averagePublishedRating).toBe(4);
  });
});
