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
    title: "Probability-based predictions",
    description: "Readable estimates without promises or false certainty.",
    icon: ChartSpline,
  },
  {
    title: "Confidence and risk indicators",
    description: "Context that helps you interpret each estimate.",
    icon: Gauge,
  },
  {
    title: "Private analysis history",
    description: "Your screenshots and reports remain account-scoped.",
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
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-kicker">Built for clarity</p>
          <h2 className="mt-4 text-3xl font-black text-[#090909] sm:text-5xl">
            Useful signals, cleanly organized.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 0.05}>
              <article className="min-h-56 bg-white p-6 sm:p-8">
                <feature.icon
                  className="size-6 text-[#b89500]"
                  aria-hidden="true"
                />
                <h3 className="mt-8 text-lg font-black text-[#090909]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/54">
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
