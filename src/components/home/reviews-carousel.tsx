"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { shouldAutoRotate } from "@/lib/motion";
import { REVIEW_SHUFFLE_INTERVAL_MS } from "@/lib/reviews";
import type { PublicReview } from "@/lib/types";

export function ReviewsCarousel({ reviews }: { reviews: PublicReview[] }) {
  const [index, setIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const reduced = Boolean(useReducedMotion());
  const activeReview = reviews[index] ?? null;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;
  const verifiedMemberCount = reviews.filter(
    (review) => review.verifiedMember,
  ).length;

  useEffect(() => {
    if (!shouldAutoRotate(reduced, interacting, reviews.length)) return;
    const interval = window.setInterval(
      () => setIndex((value) => (value + 1) % reviews.length),
      REVIEW_SHUFFLE_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [interacting, reduced, reviews.length]);

  const previous = () =>
    setIndex((value) => (value - 1 + reviews.length) % reviews.length);
  const next = () => setIndex((value) => (value + 1) % reviews.length);

  return (
    <section
      id="reviews"
      className="dark-section scroll-mt-18 border-t border-white/10 py-20 sm:py-28"
      aria-labelledby="reviews-title"
    >
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div>
            <p className="section-kicker tracking-[0.22em]">Community</p>
            <h2
              id="reviews-title"
              className="mt-4 text-4xl font-black text-white sm:text-6xl"
            >
              What members are saying
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/52 sm:text-lg">
              Real voices from Ghana and Nigeria. Reviews shuffle automatically
              so you can browse member experiences.
            </p>
          </div>
          {reviews.length > 0 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={previous}
                className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:border-signal/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                aria-label="Previous review"
                title="Previous review"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:border-signal/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                aria-label="Next review"
                title="Next review"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        <div
          className="mt-10"
          onMouseEnter={() => setInteracting(true)}
          onMouseLeave={() => setInteracting(false)}
          onFocusCapture={() => setInteracting(true)}
          onBlurCapture={() => setInteracting(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              previous();
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              next();
            }
          }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Member reviews"
          tabIndex={reviews.length ? 0 : -1}
        >
          {reviews.length === 0 || !activeReview ? (
            <EmptyState
              icon={MessagesSquare}
              title="No reviews yet"
              description="Member reviews will appear here once they are available."
              tone="dark"
            />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={activeReview.id}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-3xl rounded-[1.75rem] border border-white/10 bg-black/35 p-7 shadow-[0_18px_55px_rgba(0,0,0,0.18)] sm:p-10"
                aria-label={`Review from ${activeReview.displayName}`}
                aria-live="polite"
              >
                <RatingStars
                  rating={activeReview.rating}
                  className="text-signal"
                />
                <blockquote className="mt-7 text-xl leading-9 font-semibold text-white/70">
                  “{activeReview.body}”
                </blockquote>
                <footer className="mt-9 flex items-center gap-4 border-t border-white/10 pt-6">
                  <span
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-alert text-lg font-black text-white"
                    aria-hidden="true"
                  >
                    {activeReview.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-lg font-black text-white">
                      {activeReview.displayName}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      <time dateTime={activeReview.publishedAt}>
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(activeReview.publishedAt))}
                      </time>
                    </p>
                  </div>
                  {activeReview.verifiedMember ? (
                    <span className="ml-auto rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-black tracking-[0.12em] text-success uppercase">
                      Verified
                    </span>
                  ) : null}
                </footer>
              </motion.article>
            </AnimatePresence>
          )}
        </div>
        {reviews.length > 0 ? (
          <div
            className="mt-7 flex flex-wrap justify-center gap-2"
            aria-label="Review pagination"
          >
            {reviews.map((review, reviewIndex) => (
              <button
                key={review.id}
                type="button"
                onClick={() => setIndex(reviewIndex)}
                className={
                  reviewIndex === index
                    ? "h-2 w-7 rounded-full bg-signal"
                    : "size-2 rounded-full bg-white/25"
                }
                aria-label={`Show review ${reviewIndex + 1}`}
                aria-current={reviewIndex === index ? "true" : undefined}
              />
            ))}
          </div>
        ) : null}
        {reviews.length > 0 && averageRating !== null ? (
          <div className="mt-14 grid grid-cols-3 gap-3 rounded-[1.75rem] border border-signal/25 bg-white/[0.035] p-5 text-center shadow-[0_0_40px_rgba(255,202,39,0.05)] sm:p-8">
            <div>
              <p className="text-3xl font-black text-signal sm:text-5xl">
                {averageRating.toFixed(1)} / 5
              </p>
              <p className="mt-3 text-xs font-black tracking-[0.12em] text-white/45 uppercase">
                Avg rating
              </p>
            </div>
            <div>
              <p className="text-3xl font-black text-signal sm:text-5xl">
                {reviews.length}
              </p>
              <p className="mt-3 text-xs font-black tracking-[0.12em] text-white/45 uppercase">
                Reviews shown
              </p>
            </div>
            <div>
              <p className="text-3xl font-black text-signal sm:text-5xl">
                {verifiedMemberCount}
              </p>
              <p className="mt-3 text-xs font-black tracking-[0.12em] text-white/45 uppercase">
                Verified
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
