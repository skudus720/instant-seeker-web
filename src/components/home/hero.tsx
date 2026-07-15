import { ArrowRight, ChartNoAxesCombined } from "lucide-react";
import Link from "next/link";
import { HeroLiveStats } from "@/components/home/hero-live-stats";
import { TicketShowcase } from "@/components/home/ticket-showcase";
import { Reveal } from "@/components/ui/reveal";
import type { PublicStats } from "@/lib/types";

function contentString(
  content: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
) {
  const value = content?.[key];
  return typeof value === "string" && value.trim()
    ? value.slice(0, 240)
    : fallback;
}

export function Hero({
  stats,
  content,
  tickerContent,
}: {
  stats: PublicStats;
  content?: Record<string, unknown>;
  tickerContent?: Record<string, unknown>;
}) {
  const defaultTickerItems = [
    "Approved records only",
    "Screenshots discarded after analysis",
    "18+ responsible analysis",
    "Independent service",
    "Guaranteed match picks",
  ];
  const tickerItems = Array.isArray(tickerContent?.items)
    ? tickerContent.items
        .filter((item): item is string => typeof item === "string")
        .slice(0, 8)
    : defaultTickerItems;
  const eyebrow = contentString(
    content,
    "eyebrow",
    "Live AI guaranteed match picks",
  );
  const title = contentString(content, "title", "Instant Seeker");
  const subtitle = contentString(
    content,
    "subtitle",
    "SportyBet · Instant Football screenshot analysis",
  );
  const description = contentString(
    content,
    "description",
    "The AI analyzes the visible match screenshot and returns guaranteed matches to win in seconds.",
  );

  return (
    <section className="data-grid relative overflow-hidden bg-ink text-white">
      <div
        className="absolute inset-x-0 top-0 h-px bg-signal/50"
        aria-hidden="true"
      />
      <div className="border-b border-signal/25 bg-signal text-ink">
        <div className="mx-auto flex max-w-[1200px] overflow-hidden px-5 py-2.5 text-xs font-black tracking-[0] uppercase sm:px-8">
          <div className="flex min-w-max animate-[ticker_24s_linear_infinite] items-center gap-4 motion-reduce:animate-none">
            {[...tickerItems, ...tickerItems].map((item, itemIndex) => (
              <span
                key={`${item}-${itemIndex}`}
                className="flex items-center gap-4"
              >
                {item}
                <span aria-hidden="true">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto grid min-h-[calc(100svh-7.25rem)] max-w-[1200px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-signal/35 bg-signal/10 px-3 py-1.5 text-xs font-black text-signal uppercase">
              <ChartNoAxesCombined className="size-4" aria-hidden="true" />
              {eyebrow}
            </p>
            <h1 className="max-w-3xl text-6xl leading-[0.9] font-black tracking-[0] text-balance uppercase italic sm:text-7xl lg:text-8xl xl:text-9xl">
              {title}
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 font-black text-signal sm:text-2xl">
              {subtitle}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
              {description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-signal px-7 py-3.5 font-black text-ink shadow-[0_0_34px_rgba(255,202,39,0.22)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
              >
                {contentString(content, "primaryCtaLabel", "Get Started")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#reviews"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-bold text-white backdrop-blur transition-colors hover:border-signal/55 hover:bg-signal/8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
              >
                {contentString(content, "secondaryCtaLabel", "See Reviews")}
              </Link>
            </div>
            <HeroLiveStats initialStats={stats} />
            <div className="sr-only">
              Instant Seeker provides guaranteed match picks and does not accept
              bets or handle gambling funds.
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="pb-5 lg:pb-0">
          <TicketShowcase />
        </Reveal>
      </div>
      <div className="mx-auto flex max-w-[1200px] items-center gap-4 border-t border-white/10 px-5 py-5 text-xs text-white/42 sm:px-8">
        <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
        <span>Independent analysis · No betting funds handled · 18+ only</span>
      </div>
    </section>
  );
}
