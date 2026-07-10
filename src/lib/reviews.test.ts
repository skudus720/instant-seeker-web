import { describe, expect, it } from "vitest";
import { filterApprovedReviews, selectDailyReviews } from "@/lib/reviews";
import type { PublicReview } from "@/lib/types";

const reviews: PublicReview[] = Array.from({ length: 8 }, (_, index) => ({
  id: `review-${index}`,
  displayName: `Member ${index}`,
  rating: (index % 5) + 1,
  body: `A genuine review body number ${index}.`,
  publishedAt: "2026-07-01T12:00:00.000Z",
  verifiedMember: true,
  moderationStatus: index === 7 ? "pending" : "approved",
}));

describe("review publication", () => {
  it("filters out every unapproved review", () => {
    expect(filterApprovedReviews(reviews)).toHaveLength(7);
  });

  it("keeps daily selection stable for the same calendar date", () => {
    const date = new Date("2026-07-10T08:00:00.000Z");
    const first = selectDailyReviews(reviews, date, 4).map(
      (review) => review.id,
    );
    const second = selectDailyReviews(reviews, date, 4).map(
      (review) => review.id,
    );
    expect(second).toEqual(first);
    expect(first).not.toContain("review-7");
  });
});
