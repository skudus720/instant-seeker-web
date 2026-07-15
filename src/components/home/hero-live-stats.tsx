"use client";

import { useEffect, useState } from "react";
import { getGrowingShowcaseStats } from "@/lib/stats";
import type { PublicStats } from "@/lib/types";

const TICK_MS = 4_200;

function formatCompactAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
}

function buildRows(stats: PublicStats) {
  return [
    {
      label: "Verified winners",
      value: stats.verifiedWinners.toLocaleString("en-GH"),
    },
    {
      label: "Verified amount",
      value: formatCompactAmount(
        stats.totalVerifiedAmountWon,
        stats.currency,
      ),
    },
    {
      label: "Screenshots analyzed",
      value: stats.screenshotsAnalyzed.toLocaleString("en-GH"),
    },
  ] as const;
}

export function HeroLiveStats({
  initialStats,
}: {
  initialStats: PublicStats;
}) {
  const [stats, setStats] = useState(initialStats);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    setStats(initialStats);
    setTicks(0);
  }, [initialStats]);

  useEffect(() => {
    if (!initialStats.demo) return;

    const interval = window.setInterval(() => {
      setTicks((value) => value + 1);
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [initialStats.demo]);

  useEffect(() => {
    if (!initialStats.demo) {
      setStats(initialStats);
      return;
    }

    const base = getGrowingShowcaseStats(new Date(), initialStats.currency);
    setStats({
      ...base,
      verifiedWinners: base.verifiedWinners + Math.floor(ticks / 11),
      totalVerifiedAmountWon: base.totalVerifiedAmountWon + ticks * 95,
      screenshotsAnalyzed: base.screenshotsAnalyzed + ticks,
    });
  }, [initialStats, ticks]);

  return (
    <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/10 pt-7 sm:gap-5">
      {buildRows(stats).map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="truncate text-xl leading-none font-black tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl">
            {item.value}
          </p>
          <p className="mt-2 text-[11px] leading-4 font-bold text-signal/75 sm:text-sm sm:leading-5">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
