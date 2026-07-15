import { BrainCircuit, Camera, ClipboardCheck, Smartphone } from "lucide-react";
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
    title: "Take screenshot",
    description: "Capture a clear screenshot of the visible matches.",
    icon: Camera,
  },
  {
    number: "03",
    title: "Upload for analysis",
    description:
      "Instant Seeker reads visible fixture details and returns guaranteed matches to win.",
    icon: BrainCircuit,
  },
  {
    number: "04",
    title: "Play the picks",
    description:
      "Use the AI-chosen matches to win with guaranteed outcomes from the analysis.",
    icon: ClipboardCheck,
  },
] as const;

export function HowItWorks({ content }: { content?: Record<string, unknown> }) {
  const heading =
    typeof content?.heading === "string" && content.heading.trim()
      ? content.heading.slice(0, 120)
      : "4 steps. That's it.";
  const configuredSteps = Array.isArray(content?.steps)
    ? content.steps.slice(0, 4)
    : [];
  const visibleSteps = steps.map((step, index) => {
    const configured = configuredSteps[index];
    if (!configured || typeof configured !== "object") return step;
    const record = configured as Record<string, unknown>;
    return {
      ...step,
      title:
        typeof record.title === "string" && record.title.trim()
          ? record.title.slice(0, 80)
          : step.title,
      description:
        typeof record.description === "string" && record.description.trim()
          ? record.description.slice(0, 240)
          : step.description,
    };
  });
  return (
    <section
      id="how-it-works"
      className="dark-section scroll-mt-18 border-t border-white/10 py-20 sm:py-28"
    >
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="section-kicker tracking-[0.22em]">How it works</p>
          <h2 className="mt-4 text-4xl font-black text-white sm:text-6xl">
            {heading}
          </h2>
        </Reveal>
        <div className="relative mt-12 grid gap-5 lg:grid-cols-4">
          <span
            className="absolute top-[7.6rem] right-[12%] left-[12%] hidden h-px bg-signal/18 lg:block"
            aria-hidden="true"
          />
          {visibleSteps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08}>
              <article className="relative flex min-h-[19rem] flex-col items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 text-center shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:min-h-[22rem] sm:p-8">
                <p className="text-xs font-black tracking-[0.24em] text-white/48 uppercase">
                  Step {step.number}
                </p>
                <div className="mt-8 grid size-16 place-items-center rounded-2xl border border-white/12 bg-white/[0.035] shadow-inner shadow-white/5">
                  <step.icon
                    className="size-8 text-signal"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-8 text-2xl font-black text-white">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-xs text-base leading-7 text-white/55">
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
