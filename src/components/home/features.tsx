import {
  ChartSpline,
  Gauge,
  History,
  ScanText,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const features = [
  {
    title: "Fast screenshot upload",
    description: "Optimized, validated image handling from phone or desktop.",
    icon: UploadCloud,
  },
  {
    title: "Match extraction",
    description: "Turns visible fixture information into structured rows.",
    icon: ScanText,
  },
  {
    title: "Guaranteed match picks",
    description: "AI selects the matches to win with guaranteed outcomes.",
    icon: ChartSpline,
  },
  {
    title: "Clear winning selections",
    description: "Each analysis returns decisive teams ready to play.",
    icon: Gauge,
  },
  {
    title: "Private analysis history",
    description: "Screenshots are discarded; reports remain account-scoped.",
    icon: History,
  },
  {
    title: "Mobile-first experience",
    description: "Designed around quick uploads on everyday phones.",
    icon: Smartphone,
  },
] as const;

export function Features() {
  return (
    <section className="dark-section border-t border-white/10 py-20 sm:py-28">
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-kicker">Built for clarity</p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
            Useful signals, cleanly organized.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 0.05}>
              <article className="min-h-56 bg-white/[0.045] p-6 transition-colors hover:bg-white/[0.07] sm:p-8">
                <feature.icon
                  className="size-6 text-signal"
                  aria-hidden="true"
                />
                <h3 className="mt-8 text-lg font-black text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/56">
                  {feature.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
