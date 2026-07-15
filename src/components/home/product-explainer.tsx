import {
  ChartNoAxesCombined,
  FileChartColumn,
  ImageUp,
  ScanText,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const stages = [
  { label: "Screenshot", icon: ImageUp },
  { label: "Match extraction", icon: ScanText },
  { label: "Guaranteed picks", icon: ChartNoAxesCombined },
  { label: "Matches to win", icon: FileChartColumn },
];

const capabilities = [
  "Reads visible fixture information from your uploaded screenshot",
  "Organizes detected matches into a consistent report",
  "Returns guaranteed matches to win from the analysis",
  "Highlights clear winning team selections",
  "Saves previous analyses privately to your account",
];

export function ProductExplainer() {
  return (
    <section className="dark-section border-t border-white/10 py-20 text-white sm:py-28">
      <div className="relative mx-auto grid max-w-[1200px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="section-kicker text-signal">What Instant Seeker does</p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            From screenshot to structured insight
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/58">
            The AI analyzes the match screenshot and returns guaranteed matches
            to win from visible information. It does not access private
            sportsbook systems or hidden data.
          </p>
          <ul className="mt-8 grid gap-3">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="flex items-start gap-3 text-sm leading-6 text-white/72"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-signal"
                  aria-hidden="true"
                />
                {capability}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            {stages.map((stage, index) => (
              <div
                key={stage.label}
                className="relative grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/10 px-2 py-5 last:border-b-0 sm:px-4"
              >
                <span className="text-xs font-black text-white/28">
                  0{index + 1}
                </span>
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-xl border border-signal/30 bg-signal/10 text-signal">
                    <stage.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-bold">{stage.label}</span>
                </div>
                <span className="h-px w-9 bg-signal/55" aria-hidden="true" />
              </div>
            ))}
            <span className="pipeline-pulse" aria-hidden="true" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
