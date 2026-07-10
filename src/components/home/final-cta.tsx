import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-[1200px] gap-8 border-l-8 border-[#090909] bg-[#ffd400] px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-14">
        <div>
          <h2 className="text-3xl font-black text-[#090909] sm:text-5xl">
            Ready to analyze your first screenshot?
          </h2>
          <p className="mt-4 text-sm font-semibold text-black/58">
            Instant Seeker provides probability-based analysis, not guaranteed
            results.
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#090909] px-6 py-3 font-black text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#090909] active:translate-y-0"
        >
          Create Your Account
          <ArrowRight className="size-4 text-[#ffd400]" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
