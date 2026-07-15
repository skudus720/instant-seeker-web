"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Radio, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { PublicWin } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export function LiveWinnerTicker({
  initialWins,
}: {
  initialWins: PublicWin[];
}) {
  const [wins, setWins] = useState(initialWins);
  const reduced = useReducedMotion();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/public/wins", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { wins: PublicWin[] };
      setWins(payload.wins.filter((win) => !win.sample));
    } catch {
      // The existing verified list remains visible during transient network errors.
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refresh, 30_000);
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      ?.channel("public-win-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_win_activity" },
        refresh,
      )
      .subscribe();
    return () => {
      window.clearInterval(interval);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <section
      className="dark-section border-t border-white/10 py-20 sm:py-24"
      aria-labelledby="recent-wins-title"
    >
      <div className="relative mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-black text-signal uppercase">
            <Radio className="size-4" aria-hidden="true" />
            Verified records only
          </span>
          <h2
            id="recent-wins-title"
            className="mt-4 text-3xl font-black text-white sm:text-5xl"
          >
            Recent Verified Wins
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/58">
            Activity appears only after an authorized reviewer verifies the
            record. Names are shortened and private ticket data never appears
            here.
          </p>
        </div>
        {wins.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No verified wins published yet"
            description="Verified activity will appear here after genuine records are submitted and approved. No random notifications are generated."
            tone="dark"
          />
        ) : (
          <div
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
            aria-live="polite"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {wins.slice(0, 6).map((win, index) => (
                <motion.article
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  key={win.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/8 px-3 py-4 last:border-b-0 sm:px-5"
                >
                  <span
                    className="grid size-10 place-items-center rounded-xl bg-signal font-black text-ink"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-bold text-white">
                      {win.displayName}
                      <BadgeCheck
                        className="size-4 shrink-0 text-success"
                        aria-label="Verified"
                      />
                    </p>
                    <p className="mt-1 text-xs text-white/42">
                      Verified {formatRelativeTime(win.verifiedAt)}
                    </p>
                  </div>
                  <p className="text-right text-base font-black text-signal sm:text-lg">
                    {formatCurrency(win.amount, win.currency)}
                  </p>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
