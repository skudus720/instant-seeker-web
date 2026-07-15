import type { PublicStats } from "@/lib/types";

interface WinRecordForStats {
  userId: string;
  amountMinor: number;
  currency: string;
  verificationStatus: string;
  consentToPublish: boolean;
  publishedAt: string | null;
  isSample: boolean;
}

interface ReviewForStats {
  rating: number;
  moderationStatus: string;
  publishedAt: string | null;
  isSample: boolean;
}

/** Fixed launch epoch so public showcase totals grow deterministically over time. */
export const SHOWCASE_STATS_EPOCH_MS = Date.parse("2026-06-01T00:00:00.000Z");

export function getGrowingShowcaseStats(
  now = new Date(),
  currency = "GHS",
): PublicStats {
  const elapsedMs = Math.max(0, now.getTime() - SHOWCASE_STATS_EPOCH_MS);
  const hours = elapsedMs / 3_600_000;
  const days = hours / 24;

  return {
    verifiedWinners: Math.floor(2_180 + days * 47 + hours * 0.42),
    totalVerifiedAmountWon: Math.floor(
      3_250_000 + days * 85_000 + hours * 1_450,
    ),
    screenshotsAnalyzed: Math.floor(28_500 + days * 210 + hours * 5.5),
    averagePublishedRating: 4.8,
    currency,
    demo: true,
  };
}

export function calculateVerifiedStats(
  wins: WinRecordForStats[],
  completedAnalyses: number,
  reviews: ReviewForStats[],
  currency: string,
): PublicStats {
  const verifiedWins = wins.filter(
    (win) =>
      win.verificationStatus === "published" &&
      win.consentToPublish &&
      Boolean(win.publishedAt) &&
      !win.isSample &&
      win.currency === currency,
  );
  const approvedReviews = reviews.filter(
    (review) =>
      review.moderationStatus === "approved" &&
      Boolean(review.publishedAt) &&
      !review.isSample,
  );
  const average = approvedReviews.length
    ? approvedReviews.reduce((total, review) => total + review.rating, 0) /
      approvedReviews.length
    : null;

  return {
    verifiedWinners: new Set(verifiedWins.map((win) => win.userId)).size,
    totalVerifiedAmountWon: verifiedWins.reduce(
      (total, win) => total + win.amountMinor / 100,
      0,
    ),
    screenshotsAnalyzed: Math.max(0, completedAnalyses),
    averagePublishedRating: average,
    currency,
    demo: false,
  };
}
