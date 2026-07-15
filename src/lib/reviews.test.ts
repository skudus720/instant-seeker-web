import { describe, expect, it } from "vitest";
import {
  MEMBER_SHOWCASE_REVIEWS,
  REVIEW_ROTATION_HOURS,
  filterApprovedReviews,
  getShowcaseReviews,
  selectDailyReviews,
  selectRotatingReviews,
} from "@/lib/reviews";
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

  it("keeps review rotation stable within a window and changes after a few hours", () => {
    const firstWindow = new Date("2026-07-10T08:30:00.000Z");
    const sameWindow = new Date("2026-07-10T10:45:00.000Z");
    const nextWindow = new Date(
      firstWindow.getTime() + REVIEW_ROTATION_HOURS * 60 * 60 * 1_000,
    );

    const first = selectRotatingReviews(reviews, firstWindow, 4).map(
      (review) => review.id,
    );
    const second = selectRotatingReviews(reviews, sameWindow, 4).map(
      (review) => review.id,
    );
    const third = selectRotatingReviews(reviews, nextWindow, 4).map(
      (review) => review.id,
    );

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
    expect(third).not.toContain("review-7");
  });

  it("provides Ghanaian and Nigerian showcase reviews for the homepage", () => {
    const showcase = getShowcaseReviews(new Date("2026-07-14T12:00:00.000Z"));
    expect(showcase.length).toBe(MEMBER_SHOWCASE_REVIEWS.length);
    expect(showcase.map((review) => review.displayName)).toEqual(
      expect.arrayContaining([
        "Kwame Mensah",
        "Ama Boateng",
        "Aisha Bello",
        "Chinedu Okafor",
        "Funke Adebayo",
        "Ngozi Eze",
      ]),
    );
    expect(
      showcase.every(
        (review) =>
          review.moderationStatus === "approved" && review.body.length > 0,
      ),
    ).toBe(true);
  });
});
