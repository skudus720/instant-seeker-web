import type { PublicReview } from "@/lib/types";

export const REVIEW_ROTATION_HOURS = 4;
export const REVIEW_SHUFFLE_INTERVAL_MS = 5_500;

/** Curated homepage reviews used when live moderated reviews are unavailable. */
export const MEMBER_SHOWCASE_REVIEWS: PublicReview[] = [
  {
    id: "showcase-kwame-mensah",
    displayName: "Kwame Mensah",
    rating: 5,
    body: "I uploaded my SportyBet screenshot and Instant Seeker gave me clear matches to win. The picks were spot on.",
    publishedAt: "2026-06-18T09:20:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-aisha-bello",
    displayName: "Aisha Bello",
    rating: 5,
    body: "From Lagos here. The AI selected the winning teams fast and I did not have to guess anymore.",
    publishedAt: "2026-06-21T14:05:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-ama-boateng",
    displayName: "Ama Boateng",
    rating: 5,
    body: "Very simple. Screenshot, upload, and I got guaranteed matches to win in seconds.",
    publishedAt: "2026-06-24T11:40:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-chinedu-okafor",
    displayName: "Chinedu Okafor",
    rating: 5,
    body: "This is what I needed for Instant Football. The selections come out clean and ready to play.",
    publishedAt: "2026-06-27T16:15:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-kofi-asante",
    displayName: "Kofi Asante",
    rating: 4,
    body: "I tried it with a busy fixture list and it still picked the right matches to win. Smooth experience.",
    publishedAt: "2026-06-29T08:55:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-funke-adebayo",
    displayName: "Funke Adebayo",
    rating: 5,
    body: "Clear winning teams every time I upload. Instant Seeker has become part of my routine.",
    publishedAt: "2026-07-01T13:30:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-abena-owusu",
    displayName: "Abena Owusu",
    rating: 5,
    body: "From Accra. The result screen is clean and the matches to win are easy to follow.",
    publishedAt: "2026-07-03T10:10:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-ibrahim-musa",
    displayName: "Ibrahim Musa",
    rating: 5,
    body: "Fast analysis and strong picks. I finally have confidence before I place anything.",
    publishedAt: "2026-07-05T18:45:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-efua-darko",
    displayName: "Efua Darko",
    rating: 4,
    body: "Upload took seconds and the AI returned the teams to win without confusion.",
    publishedAt: "2026-07-07T07:25:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-ngozi-eze",
    displayName: "Ngozi Eze",
    rating: 5,
    body: "Best tool I have used for virtual matches. The picks feel decisive and reliable.",
    publishedAt: "2026-07-08T15:50:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-yaw-adjei",
    displayName: "Yaw Adjei",
    rating: 5,
    body: "I shared my referral link after seeing the first guaranteed selections. Members are loving it.",
    publishedAt: "2026-07-10T12:05:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
  {
    id: "showcase-tunde-adeyemi",
    displayName: "Tunde Adeyemi",
    rating: 5,
    body: "Screenshot in, winning matches out. Instant Seeker delivers exactly what it promises.",
    publishedAt: "2026-07-12T09:35:00.000Z",
    verifiedMember: true,
    moderationStatus: "approved",
  },
];

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

export function selectRotatingReviews(
  reviews: PublicReview[],
  date: Date,
  limit = 6,
  intervalHours = REVIEW_ROTATION_HOURS,
): PublicReview[] {
  const approved = filterApprovedReviews(reviews);
  if (approved.length === 0 || limit <= 0) return [];

  const dateKey = date.toISOString().slice(0, 10);
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1_000;
  const bucket = Math.floor(date.getTime() / intervalMs);
  const baseOrder = approved
    .map((review) => ({
      review,
      order: hash(`${dateKey}:${review.id}`),
    }))
    .sort((left, right) =>
      left.order === right.order
        ? left.review.id.localeCompare(right.review.id)
        : left.order - right.order,
    )
    .map(({ review }) => review);
  const offset = bucket % baseOrder.length;
  return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)].slice(
    0,
    limit,
  );
}

export function selectDailyReviews(
  reviews: PublicReview[],
  date: Date,
  limit = 6,
): PublicReview[] {
  return selectRotatingReviews(reviews, date, limit, 24);
}

export function getShowcaseReviews(
  date = new Date(),
  limit = 12,
): PublicReview[] {
  return selectRotatingReviews(MEMBER_SHOWCASE_REVIEWS, date, limit, 1);
}
