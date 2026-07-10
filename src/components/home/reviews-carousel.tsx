"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { shouldAutoRotate } from "@/lib/motion";
import type { PublicReview } from "@/lib/types";

export function ReviewsCarousel({ reviews }: { reviews: PublicReview[] }) {
  const [index, setIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const reduced = Boolean(useReducedMotion());
  const visible = useMemo(
    () =>
      Array.from(
        { length: Math.min(3, reviews.length) },
        (_, offset) => reviews[(index + offset) % reviews.length],
      ),
    [index, reviews],
  );

  useEffect(() => {
    if (!shouldAutoRotate(reduced, interacting, reviews.length)) return;
    const interval = window.setInterval(
      () => setIndex((value) => (value + 1) % reviews.length),
      7_000,
    );
    return () => window.clearInterval(interval);
  }, [interacting, reduced, reviews.length]);

  const previous = () =>
    setIndex((value) => (value - 1 + reviews.length) % reviews.length);
  const next = () => setIndex((value) => (value + 1) % reviews.length);

  return (
    <section
      id="reviews"
      className="scroll-mt-18 bg-[#f4f5f0] py-20 sm:py-28"
      aria-labelledby="reviews-title"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Approved reviews only</p>
            <h2
              id="reviews-title"
              className="mt-4 text-3xl font-black text-[#090909] sm:text-5xl"
            >
              What members are saying
            </h2>
          </div>
          {reviews.length > 0 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={previous}
                className="grid size-11 place-items-center rounded-md border border-black/20 bg-white text-[#090909] hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]"
                aria-label="Previous review"
                title="Previous review"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                className="grid size-11 place-items-center rounded-md border border-black/20 bg-white text-[#090909] hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]"
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
          aria-label="Approved member reviews"
          tabIndex={reviews.length ? 0 : -1}
        >
          {reviews.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No approved reviews yet"
              description="Genuine member reviews will appear here only after moderation. No sample review is presented as real."
            />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={reduced ? false : { opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -14 }}
                transition={{ duration: 0.3 }}
                className="grid gap-5 md:grid-cols-3"
              >
                {visible.map((review, cardIndex) => (
                  <article
                    key={review.id}
                    className={
                      cardIndex > 0
                        ? "hidden min-h-72 rounded-lg border border-black/10 bg-white p-6 md:block"
                        : "min-h-72 rounded-lg border border-black/10 bg-white p-6"
                    }
                    aria-label={`Review ${index + cardIndex + 1} of ${reviews.length}`}
                  >
                    <RatingStars rating={review.rating} />
                    <blockquote className="mt-7 text-base leading-7 font-semibold text-[#242624]">
                      “{review.body}”
                    </blockquote>
                    <footer className="mt-9 border-t border-black/8 pt-5">
                      <p className="font-black text-[#090909]">
                        {review.displayName}
                      </p>
                      <p className="mt-1 text-xs text-black/45">
                        {review.verifiedMember ? "Verified member · " : ""}
                        <time dateTime={review.publishedAt}>
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(review.publishedAt))}
                        </time>
                      </p>
                    </footer>
                  </article>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        {reviews.length > 0 ? (
          <div
            className="mt-7 flex justify-center gap-2"
            aria-label="Review pagination"
          >
            {reviews.map((review, reviewIndex) => (
              <button
                key={review.id}
                type="button"
                onClick={() => setIndex(reviewIndex)}
                className={
                  reviewIndex === index
                    ? "h-2 w-7 rounded-full bg-[#090909]"
                    : "size-2 rounded-full bg-black/20"
                }
                aria-label={`Show review ${reviewIndex + 1}`}
                aria-current={reviewIndex === index ? "true" : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
