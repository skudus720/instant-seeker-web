import {
  ArrowLeft,
  ChartNoAxesCombined,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { isDemoMode } from "@/lib/config";

export function AuthShell({
  mode,
  title,
  description,
  notice,
  children,
}: {
  mode: "login" | "signup";
  title: string;
  description: string;
  notice?: string;
  children: ReactNode;
}) {
  const isSignup = mode === "signup";

  return (
    <main
      id="main-content"
      className="auth-surface relative min-h-dvh overflow-hidden bg-ink text-white"
    >
      <div className="auth-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1360px] flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex min-h-20 items-center justify-between gap-5 border-b border-white/10 sm:min-h-24">
          <Logo inverse />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-white/62 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(460px,560px)] lg:gap-18 lg:py-16">
          <section
            className="mx-auto hidden w-full max-w-xl lg:mx-0 lg:block"
            aria-labelledby="auth-context-title"
          >
            <p className="section-kicker">AI-assisted match analysis</p>
            <h2
              id="auth-context-title"
              className="mt-5 max-w-[11ch] text-5xl leading-[0.98] font-black sm:text-6xl"
            >
              {isSignup
                ? "One account. A clearer workflow."
                : "Your private analysis workspace."}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
              {isSignup
                ? "Create your workspace, complete one secure payment, and keep every structured analysis report together."
                : "Return to your saved reports and analyze a new screenshot without retaining the image."}
            </p>

            <div className="relative mt-10 max-w-lg border-y border-white/10 py-6">
              <div className="auth-scan-line" aria-hidden="true" />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Screenshot", icon: ScanLine },
                  { label: "Probability", icon: ChartNoAxesCombined },
                  { label: "Private report", icon: LockKeyhole },
                ].map((item) => (
                  <div key={item.label} className="min-w-0">
                    <span className="grid size-10 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-signal">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-xs font-bold text-white/48">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex items-start gap-3 text-sm leading-6 text-white/48">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden="true"
              />
              <p>
                Independent service. No bets or betting funds are handled.
                Probability insights are estimates, never guarantees. 18+.
              </p>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[560px] lg:mx-0">
            <div className="mb-7 text-center lg:text-left">
              <p className="text-xs font-black text-signal uppercase">
                {isSignup ? "SPORTYBET AI" : "Member access"}
              </p>
              <h1 className="mt-3 text-4xl leading-none font-black sm:text-5xl">
                {title}
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/52 lg:mx-0">
                {description}
              </p>
            </div>

            {isDemoMode ? (
              <p
                className="mb-4 rounded-md border border-signal/35 bg-signal/10 px-4 py-3 text-sm font-semibold text-signal"
                role="status"
              >
                Demo mode: forms can be previewed, but no account is stored and
                no payment is collected.
              </p>
            ) : null}

            {notice ? (
              <p
                className="mb-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200"
                role="status"
              >
                {notice}
              </p>
            ) : null}

            <div className="rounded-lg border border-white/12 bg-[#121212] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:p-7">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
