import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const normalized = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${normalized} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn("size-4 text-signal-ink", className)}
          fill={index < normalized ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
