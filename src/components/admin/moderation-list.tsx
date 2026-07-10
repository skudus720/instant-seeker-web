import { Check, ImageOff, MessageSquareText, Trophy, X } from "lucide-react";
import Image from "next/image";
import { moderateReviewAction, verifyWinAction } from "@/actions/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatCurrency } from "@/lib/utils";

interface PendingWin {
  id: string;
  amount: number;
  currency: string;
  won_at: string;
  created_at: string;
  ticket_image_path: string | null;
}

interface PendingReview {
  id: string;
  rating: number;
  body: string;
  created_at: string;
}

function DecisionButtons({ id, type }: { id: string; type: "win" | "review" }) {
  const action = type === "win" ? verifyWinAction : moderateReviewAction;
  return (
    <div className="flex gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input
          type="hidden"
          name="decision"
          value={type === "win" ? "verified" : "approved"}
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <Check className="size-4" aria-hidden="true" />
          Approve
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="rejected" />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-black text-rose-800 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <X className="size-4" aria-hidden="true" />
          Reject
        </button>
      </form>
    </div>
  );
}

export function WinModerationList({ wins }: { wins: PendingWin[] }) {
  if (!wins.length)
    return (
      <EmptyState
        icon={Trophy}
        title="No pending win records"
        description="New user submissions will appear here for evidence review."
      />
    );
  return (
    <div className="grid gap-4">
      {wins.map((win) => (
        <article
          key={win.id}
          className="grid overflow-hidden rounded-lg border border-black/10 bg-white md:grid-cols-[220px_1fr]"
        >
          <div className="relative min-h-48 border-b border-black/10 bg-[#111] md:border-r md:border-b-0">
            {win.ticket_image_path ? (
              <Image
                src={`/api/admin/win-ticket?id=${encodeURIComponent(win.id)}`}
                alt="Private submitted ticket for administrator verification"
                fill
                sizes="220px"
                unoptimized
                className="object-contain p-3"
              />
            ) : (
              <div className="grid h-full place-items-center text-white/45">
                <ImageOff aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-black text-black/40 uppercase">
              Submitted record
            </p>
            <p className="mt-3 text-2xl font-black text-[#090909]">
              {formatCurrency(win.amount, win.currency)}
            </p>
            <dl className="mt-5 grid gap-2 text-sm text-black/58 sm:grid-cols-2">
              <div>
                <dt className="font-bold text-black">Won at</dt>
                <dd>{new Date(win.won_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-bold text-black">Submitted</dt>
                <dd>{new Date(win.created_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <DecisionButtons id={win.id} type="win" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ReviewModerationList({
  reviews,
}: {
  reviews: PendingReview[];
}) {
  if (!reviews.length)
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No pending reviews"
        description="Submitted member reviews will remain private until an administrator approves them."
      />
    );
  return (
    <div className="grid gap-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-lg border border-black/10 bg-white p-5 sm:p-6"
        >
          <RatingStars rating={review.rating} />
          <blockquote className="mt-4 max-w-3xl text-base leading-7 font-semibold text-[#242624]">
            “{review.body}”
          </blockquote>
          <p className="mt-4 text-xs text-black/40">
            Submitted {new Date(review.created_at).toLocaleString()}
          </p>
          <div className="mt-6">
            <DecisionButtons id={review.id} type="review" />
          </div>
        </article>
      ))}
    </div>
  );
}
