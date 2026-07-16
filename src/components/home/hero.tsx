import { ArrowRight } from "lucide-react";
import Link from "next/link";
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
  content,
}: {
  stats?: PublicStats;
  content?: Record<string, unknown>;
  tickerContent?: Record<string, unknown>;
}) {
  const eyebrow = contentString(
    content,
    "eyebrow",
    "AI-Powered Analysis · 18+",
  );
  const title = contentString(
    content,
    "title",
    "Turn match screenshots into clearer probability insights.",
  );
  const description = contentString(
    content,
    "description",
    "Upload your virtual-match screenshots and receive AI-assisted probability estimates. No guarantees — just smarter analysis to inform your decisions.",
  );

  return (
    <section className="canva-hero relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-signal/50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-32 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-signal/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-20%] left-[-12%] h-[28rem] w-[28rem] rounded-full bg-signal/[0.06] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[1200px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-16">
        <Reveal>
          <div className="max-w-2xl">
            <p className="inline-flex items-center rounded-full border border-signal/55 px-3.5 py-1.5 text-[11px] font-black tracking-[0.02em] text-signal uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-6 max-w-[15ch] text-4xl leading-[1.02] font-black text-balance sm:text-5xl lg:text-6xl xl:text-[3.75rem]">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
              {description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-signal px-7 py-3.5 font-black text-ink shadow-[0_0_40px_rgba(255,202,39,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
              >
                {contentString(content, "primaryCtaLabel", "Start Analysing")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/22 bg-transparent px-7 py-3.5 font-black text-white transition-colors hover:border-white/45 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
              >
                {contentString(
                  content,
                  "secondaryCtaLabel",
                  "See How It Works",
                )}
              </Link>
            </div>
            <div className="sr-only">
              Instant Seeker provides AI-assisted probability estimates and does
              not accept bets or handle gambling funds. 18+ only.
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="pb-6 lg:pb-0">
          <TicketShowcase />
        </Reveal>
      </div>
    </section>
  );
}
