import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function FinalCta({ content }: { content?: Record<string, unknown> }) {
  const value = (key: string, fallback: string) =>
    typeof content?.[key] === "string" && content[key].trim()
      ? String(content[key]).slice(0, 240)
      : fallback;
  return (
    <section className="bg-ink px-5 py-20 text-white sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1200px] text-center">
        <div>
          <h2 className="text-5xl leading-[1] font-black text-white sm:text-7xl">
            {value("title", "Ready to analyze?")}
            <span className="mt-2 block text-signal">
              {value("highlight", "Start with a screenshot.")}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/55">
            {value(
              "description",
              "Instant Seeker analyzes your screenshot and returns guaranteed matches to win.",
            )}
          </p>
        </div>
        <Link
          href="/signup"
          className="mt-10 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-signal px-9 py-4 font-black text-ink shadow-[0_0_42px_rgba(255,202,39,0.22)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
        >
          {value("buttonLabel", "Get Started")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
