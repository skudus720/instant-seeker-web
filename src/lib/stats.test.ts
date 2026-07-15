import { describe, expect, it } from "vitest";
import {
  calculateVerifiedStats,
  getGrowingShowcaseStats,
} from "@/lib/stats";

describe("verified public statistics", () => {
  it("counts only verified wins in the requested currency and approved reviews", () => {
    const stats = calculateVerifiedStats(
      [
        {
          userId: "one",
          amountMinor: 10_000,
          currency: "GHS",
          verificationStatus: "published",
          consentToPublish: true,
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: false,
        },
        {
          userId: "one",
          amountMinor: 5_000,
          currency: "GHS",
          verificationStatus: "published",
          consentToPublish: true,
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: false,
        },
        {
          userId: "two",
          amountMinor: 999_900,
          currency: "GHS",
          verificationStatus: "pending",
          consentToPublish: true,
          publishedAt: null,
          isSample: false,
        },
        {
          userId: "three",
          amountMinor: 2_000,
          currency: "USD",
          verificationStatus: "published",
          consentToPublish: true,
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: false,
        },
        {
          userId: "demo",
          amountMinor: 900_000,
          currency: "GHS",
          verificationStatus: "published",
          consentToPublish: true,
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: true,
        },
      ],
      12,
      [
        {
          rating: 5,
          moderationStatus: "approved",
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: false,
        },
        {
          rating: 1,
          moderationStatus: "pending",
          publishedAt: null,
          isSample: false,
        },
        {
          rating: 3,
          moderationStatus: "approved",
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: false,
        },
        {
          rating: 5,
          moderationStatus: "approved",
          publishedAt: "2026-07-10T00:00:00Z",
          isSample: true,
        },
      ],
      "GHS",
    );
    expect(stats.verifiedWinners).toBe(1);
    expect(stats.totalVerifiedAmountWon).toBe(150);
    expect(stats.screenshotsAnalyzed).toBe(12);
    expect(stats.averagePublishedRating).toBe(4);
  });

  it("grows showcase stats over time", () => {
    const earlier = getGrowingShowcaseStats(
      new Date("2026-06-10T00:00:00.000Z"),
    );
    const later = getGrowingShowcaseStats(new Date("2026-07-14T12:00:00.000Z"));

    expect(later.verifiedWinners).toBeGreaterThan(earlier.verifiedWinners);
    expect(later.totalVerifiedAmountWon).toBeGreaterThan(
      earlier.totalVerifiedAmountWon,
    );
    expect(later.screenshotsAnalyzed).toBeGreaterThan(
      earlier.screenshotsAnalyzed,
    );
    expect(later.verifiedWinners).toBeGreaterThan(3_000);
    expect(later.screenshotsAnalyzed).toBeGreaterThan(30_000);
  });
});
