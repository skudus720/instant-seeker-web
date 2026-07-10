import type { PublicReview } from "@/lib/types";

export function filterApprovedReviews(reviews: PublicReview[]): PublicReview[] {
  return reviews.filter(
    (review) =>
      review.moderationStatus === "approved" &&
      review.rating >= 1 &&
      review.rating <= 5 &&
      review.body.trim().length > 0,
  );
}

function hash(value: string): number {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

export function selectDailyReviews(
  reviews: PublicReview[],
  date: Date,
  limit = 6,
): PublicReview[] {
  const dateKey = date.toISOString().slice(0, 10);
  return filterApprovedReviews(reviews)
    .map((review) => ({
      review,
      order: hash(`${dateKey}:${review.id}`),
    }))
    .sort((left, right) =>
      left.order === right.order
        ? left.review.id.localeCompare(right.review.id)
        : left.order - right.order,
    )
    .slice(0, limit)
    .map(({ review }) => review);
}
