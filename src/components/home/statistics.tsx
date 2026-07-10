import { StatCard } from "@/components/home/stat-card";
import { Reveal } from "@/components/ui/reveal";
import type { PublicStats } from "@/lib/types";

export function Statistics({ stats }: { stats: PublicStats }) {
  return (
    <section id="results" className="bg-[#f4f5f0] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Evidence, not hype</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black text-[#090909] sm:text-5xl">
              Published numbers have a verification trail.
            </h2>
          </div>
          {stats.demo ? (
            <span className="self-start rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-black text-black/60 uppercase sm:self-end">
              Demo statistics
            </span>
          ) : (
            <span className="self-start rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 uppercase sm:self-end">
              Verified database totals
            </span>
          )}
        </Reveal>
        <div className="mt-10 grid gap-px bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
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
        <p className="mt-5 max-w-3xl text-xs leading-5 text-black/48">
          Winners and amounts include verified records only. Published ratings
          include approved reviews only. Demo mode displays zero rather than
          invented activity.
        </p>
      </div>
    </section>
  );
}
