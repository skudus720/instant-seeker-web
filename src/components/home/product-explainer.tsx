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
  { label: "Probability analysis", icon: ChartNoAxesCombined },
  { label: "Results report", icon: FileChartColumn },
];

const capabilities = [
  "Reads visible fixture information from your uploaded screenshot",
  "Organizes detected matches into a consistent report",
  "Generates probability estimates with confidence context",
  "Highlights risk and screenshot-quality limitations",
  "Saves previous analyses privately to your account",
];

export function ProductExplainer() {
  return (
    <section className="overflow-hidden bg-[#090909] py-20 text-white sm:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="section-kicker text-[#ffd400]">
            What Instant Seeker does
          </p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            From screenshot to structured insight
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/58">
            The AI analyzes the match screenshot and generates probability-based
            insights from visible information. It does not access private
            sportsbook systems or hidden data.
          </p>
          <ul className="mt-8 grid gap-3">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="flex items-start gap-3 text-sm leading-6 text-white/72"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-[#82f6b3]"
                  aria-hidden="true"
                />
                {capability}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative border-y border-white/12 py-5">
            {stages.map((stage, index) => (
              <div
                key={stage.label}
                className="relative grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/10 py-5 last:border-b-0"
              >
                <span className="text-xs font-black text-white/28">
                  0{index + 1}
                </span>
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-md border border-[#ffd400]/30 bg-[#ffd400]/8 text-[#ffd400]">
                    <stage.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-bold">{stage.label}</span>
                </div>
                <span className="h-px w-9 bg-[#82f6b3]/55" aria-hidden="true" />
              </div>
            ))}
            <span className="pipeline-pulse" aria-hidden="true" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
