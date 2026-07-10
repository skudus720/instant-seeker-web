"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";

export function StatCard({
  label,
  value,
  format = "integer",
  currency = "GHS",
  unavailable = false,
  accent = false,
}: {
  label: string;
  value: number;
  format?: "integer" | "currency" | "rating";
  currency?: string;
  unavailable?: boolean;
  accent?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const start = performance.now();
    const duration = 750;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value]);

  const visibleValue = reduced ? value : shown;
  const displayValue = unavailable
    ? "Not rated"
    : format === "currency"
      ? formatCurrency(visibleValue, currency)
      : format === "rating"
        ? `${visibleValue.toFixed(1)} / 5`
        : Math.round(visibleValue).toLocaleString();

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-36 border-t-2 p-5 sm:p-6",
        accent
          ? "border-[#ffd400] bg-[#090909] text-white"
          : "border-black bg-white text-[#090909]",
      )}
    >
      <p
        className={cn(
          "text-xs font-bold uppercase",
          accent ? "text-white/46" : "text-black/45",
        )}
      >
        {label}
      </p>
      <p className="mt-6 text-3xl font-black tabular-nums sm:text-4xl">
        {displayValue}
      </p>
    </div>
  );
}
