import type { PublicStats } from "@/lib/types";

interface WinRecordForStats {
  userId: string;
  amount: number;
  currency: string;
  verificationStatus: string;
}

interface ReviewForStats {
  rating: number;
  moderationStatus: string;
}

export function calculateVerifiedStats(
  wins: WinRecordForStats[],
  completedAnalyses: number,
  reviews: ReviewForStats[],
  currency: string,
): PublicStats {
  const verifiedWins = wins.filter(
    (win) => win.verificationStatus === "verified" && win.currency === currency,
  );
  const approvedReviews = reviews.filter(
    (review) => review.moderationStatus === "approved",
  );
  const average = approvedReviews.length
    ? approvedReviews.reduce((total, review) => total + review.rating, 0) /
      approvedReviews.length
    : null;

  return {
    verifiedWinners: new Set(verifiedWins.map((win) => win.userId)).size,
    totalVerifiedAmountWon: verifiedWins.reduce(
      (total, win) => total + win.amount,
      0,
    ),
    screenshotsAnalyzed: Math.max(0, completedAnalyses),
    averagePublishedRating: average,
    currency,
    demo: false,
  };
}
