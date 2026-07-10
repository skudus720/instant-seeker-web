import { Star } from "lucide-react";

export function RatingStars({ rating }: { rating: number }) {
  const normalized = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${normalized} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className="size-4 text-[#d8af00]"
          fill={index < normalized ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
