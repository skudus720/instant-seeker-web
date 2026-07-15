import { StatCard } from "@/components/home/stat-card";
import { Reveal } from "@/components/ui/reveal";
import type { PublicStats } from "@/lib/types";

export function Statistics({ stats }: { stats: PublicStats }) {
  return (
    <section id="results" className="dark-section py-20 sm:py-24">
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Live results</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black text-white sm:text-5xl">
              Verified winners, payouts, and analyses keep climbing.
            </h2>
          </div>
          <span className="self-start rounded-full border border-signal/30 bg-signal/10 px-3 py-1.5 text-xs font-black text-signal uppercase sm:self-end">
            Updating live
          </span>
        </Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Verified winners"
            value={stats.verifiedWinners}
            accent
          />
          <StatCard
            label="Total verified amount won"
            value={stats.totalVerifiedAmountWon}
            format="currency"
            currency={stats.currency}
          />
          <StatCard
            label="Screenshots analyzed"
            value={stats.screenshotsAnalyzed}
          />
          <StatCard
            label="Average published rating"
            value={stats.averagePublishedRating || 0}
            format="rating"
            unavailable={stats.averagePublishedRating == null}
          />
        </div>
        <p className="mt-5 max-w-3xl text-xs leading-5 text-white/45">
          Totals increase as more members win and more screenshots are analyzed.
        </p>
      </div>
    </section>
  );
}
