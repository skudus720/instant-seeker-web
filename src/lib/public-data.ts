import "server-only";

import { appConfig, isDemoMode } from "@/lib/config";
import { getShowcaseReviews, selectRotatingReviews } from "@/lib/reviews";
import { getGrowingShowcaseStats } from "@/lib/stats";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicReview, PublicStats, PublicWin } from "@/lib/types";

export type PublishedContentMap = Record<string, Record<string, unknown>>;

export async function getPublicStats(): Promise<PublicStats> {
  const showcase = getGrowingShowcaseStats(new Date(), appConfig.currency);
  const supabase = await createServerSupabaseClient();
  if (!supabase || isDemoMode) return showcase;

  const { data, error } = await supabase.rpc("get_public_stats", {
    requested_currency: appConfig.currency,
  });
  if (error || !data) return showcase;

  const value = Array.isArray(data) ? data[0] : data;
  const verifiedWinners = Number(value.verified_winners || 0);
  const totalVerifiedAmountWon = Number(value.total_verified_amount_won || 0);
  const screenshotsAnalyzed = Number(value.screenshots_analyzed || 0);
  const hasLiveActivity =
    verifiedWinners > 0 ||
    totalVerifiedAmountWon > 0 ||
    screenshotsAnalyzed > 0;

  if (!hasLiveActivity) return showcase;

  return {
    verifiedWinners,
    totalVerifiedAmountWon,
    screenshotsAnalyzed,
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
  if (!supabase || isDemoMode) return getShowcaseReviews(date);

  const { data, error } = await supabase.rpc("get_public_reviews");
  if (error || !data) return getShowcaseReviews(date);

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
  const rotating = selectRotatingReviews(reviews, date, 12);
  return rotating.length > 0 ? rotating : getShowcaseReviews(date);
}

export async function getPublishedContent(): Promise<PublishedContentMap> {
  const supabase = await createServerSupabaseClient();
  if (!supabase || isDemoMode) return {};
  const { data, error } = await supabase.rpc("get_public_content");
  if (error || !data) return {};
  return Object.fromEntries(
    data
      .filter(
        (entry: Record<string, unknown>) =>
          typeof entry.content_key === "string" &&
          entry.content &&
          typeof entry.content === "object" &&
          !Array.isArray(entry.content),
      )
      .map((entry: Record<string, unknown>) => [
        String(entry.content_key),
        entry.content as Record<string, unknown>,
      ]),
  );
}
