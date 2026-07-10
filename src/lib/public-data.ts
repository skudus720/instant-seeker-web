import "server-only";

import { appConfig, isDemoMode } from "@/lib/config";
import { selectDailyReviews } from "@/lib/reviews";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicReview, PublicStats, PublicWin } from "@/lib/types";

const emptyStats: PublicStats = {
  verifiedWinners: 0,
  totalVerifiedAmountWon: 0,
  screenshotsAnalyzed: 0,
  averagePublishedRating: null,
  currency: appConfig.currency,
  demo: true,
};

export async function getPublicStats(): Promise<PublicStats> {
  const supabase = await createServerSupabaseClient();
  if (!supabase || isDemoMode) return emptyStats;

  const { data, error } = await supabase.rpc("get_public_stats", {
    requested_currency: appConfig.currency,
  });
  if (error || !data) return { ...emptyStats, demo: false };

  const value = Array.isArray(data) ? data[0] : data;
  return {
    verifiedWinners: Number(value.verified_winners || 0),
    totalVerifiedAmountWon: Number(value.total_verified_amount_won || 0),
    screenshotsAnalyzed: Number(value.screenshots_analyzed || 0),
    averagePublishedRating:
      value.average_published_rating == null
        ? null
        : Number(value.average_published_rating),
    currency: appConfig.currency,
    demo: false,
  };
}

export async function getPublicWins(limit = 8): Promise<PublicWin[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase || isDemoMode) return [];

  const { data, error } = await supabase
    .from("public_win_activity")
    .select(
      "id, display_name, amount, currency, verified_at, won_at, is_sample",
    )
    .eq("is_sample", false)
    .order("verified_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return data.map((record) => ({
    id: String(record.id),
    displayName: String(record.display_name),
    amount: Number(record.amount),
    currency: String(record.currency),
    verifiedAt: String(record.verified_at),
    wonAt: String(record.won_at),
    sample: Boolean(record.is_sample),
  }));
}

export async function getDailyPublicReviews(
  date = new Date(),
): Promise<PublicReview[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase || isDemoMode) return [];

  const { data, error } = await supabase.rpc("get_public_reviews");
  if (error || !data) return [];

  const reviews: PublicReview[] = data.map(
    (review: Record<string, unknown>) => ({
      id: String(review.id),
      displayName: String(review.display_name),
      rating: Number(review.rating),
      body: String(review.body),
      publishedAt: String(review.published_at),
      verifiedMember: Boolean(review.verified_member),
      moderationStatus: "approved",
    }),
  );
  return selectDailyReviews(reviews, date, 6);
}
