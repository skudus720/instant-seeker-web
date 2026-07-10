import { ArrowRight, ChartNoAxesCombined } from "lucide-react";
import Link from "next/link";
import { TicketShowcase } from "@/components/home/ticket-showcase";
import { Reveal } from "@/components/ui/reveal";

export function Hero() {
  return (
    <section className="data-grid relative overflow-hidden bg-[#090909] text-white">
      <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[1200px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_0.82fr] lg:py-20">
        <Reveal>
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffd400]/35 bg-[#ffd400]/8 px-3 py-1.5 text-xs font-black text-[#ffd400] uppercase">
              <ChartNoAxesCombined className="size-4" aria-hidden="true" />
              AI-assisted virtual match analysis
            </p>
            <h1 className="max-w-3xl text-5xl leading-[0.98] font-black tracking-[0] text-balance sm:text-6xl lg:text-7xl xl:text-8xl">
              Turn match screenshots into clearer probability insights.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
              Upload a screenshot of virtual matches and receive structured
              predictions, confidence indicators, and risk notes in seconds.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ffd400] px-6 py-3 font-black text-[#090909] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
              >
                Get Started
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/20 px-6 py-3 font-bold text-white transition-colors hover:border-white/45 hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd400]"
              >
                See How It Works
              </Link>
            </div>
            <p className="mt-5 text-xs font-semibold text-white/42">
              Probability-based analysis. No guaranteed outcomes. 18+.
            </p>
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
