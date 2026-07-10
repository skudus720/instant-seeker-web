import { BrainCircuit, Camera, Smartphone } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    number: "01",
    title: "Open SportyBet",
    description: "Open the virtual matches you would like to review.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Take and upload a screenshot",
    description:
      "Capture a clear screenshot of the visible matches and securely upload it to Instant Seeker.",
    icon: Camera,
  },
  {
    number: "03",
    title: "Review your AI analysis",
    description:
      "Receive probability-based insights, confidence levels, and risk notes, then make your own responsible decision.",
    icon: BrainCircuit,
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-18 bg-[#f4f5f0] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="section-kicker">How to use the AI</p>
          <h2 className="mt-4 text-3xl font-black text-[#090909] sm:text-5xl">
            Three clear steps. You remain in control.
          </h2>
        </Reveal>
        <div className="relative mt-12 grid gap-5 lg:grid-cols-3">
          <span
            className="absolute top-12 right-[15%] left-[15%] hidden h-px bg-black/15 lg:block"
            aria-hidden="true"
          />
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08}>
              <article className="relative min-h-72 rounded-lg border border-black/12 bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.05)] sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="relative z-10 grid size-14 place-items-center rounded-md bg-[#ffd400] text-lg font-black text-[#090909]">
                    {step.number}
                  </span>
                  <step.icon
                    className="size-7 text-black/35"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-9 text-xl font-black text-[#090909]">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-black/58">
                  {step.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
