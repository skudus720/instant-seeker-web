import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  LockKeyhole,
  Phone,
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
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-signal/50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-28 right-[-8%] h-[30rem] w-[30rem] rounded-full bg-signal/12 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col px-5 sm:px-8">
        <header className="flex min-h-20 items-center justify-between gap-5 sm:min-h-24">
          <Logo inverse />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            {isSignup ? (
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                Login
              </Link>
            ) : null}
            <Link
              href={isSignup ? "/signup#signup-form" : "/signup"}
              className="inline-flex min-h-11 items-center rounded-full bg-signal px-4 text-sm font-black text-ink shadow-[0_0_28px_rgba(255,202,39,0.2)] transition-colors hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              Get Started
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:py-14">
          <section
            className="mx-auto hidden w-full max-w-xl lg:mx-0 lg:block"
            aria-labelledby="auth-context-title"
          >
            <p className="inline-flex items-center rounded-full border border-signal/55 px-3.5 py-1.5 text-[11px] font-black tracking-[0.02em] text-signal uppercase">
              AI-Powered Analysis · 18+
            </p>
            <h2
              id="auth-context-title"
              className="mt-6 max-w-[15ch] text-5xl leading-[1.02] font-black text-white sm:text-6xl"
            >
              {isSignup
                ? "Turn match screenshots into clearer probability insights."
                : "Return to clearer probability insights."}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/58">
              {isSignup
                ? "Create your account, pay once with Mobile Money, and keep every structured analysis report in one private workspace."
                : "Upload virtual-match screenshots and receive AI-assisted probability estimates. No guarantees — just smarter analysis."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isSignup ? (
                <>
                  <a
                    href="#signup-form"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-signal px-5 text-sm font-black text-ink shadow-[0_0_34px_rgba(255,202,39,0.22)] transition-colors hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  >
                    Start Analysing
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 items-center rounded-full border border-white/22 px-5 text-sm font-black text-white transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  >
                    Login
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-signal px-5 text-sm font-black text-ink shadow-[0_0_34px_rgba(255,202,39,0.22)] transition-colors hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  >
                    Start Analysing
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/#how-it-works"
                    className="inline-flex min-h-12 items-center rounded-full border border-white/22 px-5 text-sm font-black text-white transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  >
                    See How It Works
                  </Link>
                </>
              )}
            </div>

            <div className="relative mt-12 max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0a0a] p-5 shadow-[0_0_70px_rgba(255,202,39,0.12)]">
              <div
                className="pointer-events-none absolute inset-x-6 -bottom-8 h-24 rounded-full bg-signal/30 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative grid grid-cols-3 gap-3">
                {(isSignup
                  ? [
                      { label: "Create account", icon: ScanLine },
                      { label: "Mobile Money", icon: Phone },
                      { label: "Start analysing", icon: ChartNoAxesCombined },
                    ]
                  : [
                      { label: "Screenshot", icon: ScanLine },
                      { label: "Probability", icon: ChartNoAxesCombined },
                      { label: "Private report", icon: LockKeyhole },
                    ]
                ).map((item) => (
                  <div key={item.label} className="min-w-0">
                    <span className="grid size-11 place-items-center rounded-2xl border border-signal/30 bg-signal/10 text-signal">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-xs font-bold text-white/55">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              <div
                className="relative mt-5 h-1 rounded-full bg-signal shadow-[0_0_16px_rgba(255,202,39,0.55)]"
                aria-hidden="true"
              />
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

          <section className="mx-auto w-full max-w-[520px] lg:mx-0 lg:justify-self-end">
            <div className="mb-6 text-center lg:text-left">
              <p className="inline-flex items-center rounded-full border border-signal/55 px-3 py-1 text-[11px] font-black tracking-[0.02em] text-signal uppercase lg:hidden">
                AI-Powered Analysis · 18+
              </p>
              <p className="mt-4 text-xs font-black text-signal uppercase lg:mt-0">
                {isSignup ? "Sign-up & Mobile Money" : "Member access"}
              </p>
              <h1
                id={isSignup ? "signup-form" : undefined}
                className="mt-3 scroll-mt-28 text-4xl leading-none font-black sm:text-5xl"
              >
                {title}
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/55 lg:mx-0">
                {description}
              </p>
            </div>

            {isDemoMode ? (
              <p
                className="mb-4 rounded-2xl border border-signal/35 bg-signal/10 px-4 py-3 text-sm font-semibold text-signal"
                role="status"
              >
                Demo mode: forms can be previewed, but no account is stored and
                no payment is collected.
              </p>
            ) : null}

            {notice ? (
              <p
                className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200"
                role="status"
              >
                {notice}
              </p>
            ) : null}

            <div className="auth-panel relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#0c0c0c] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-7">
              <div
                className="pointer-events-none absolute inset-x-10 -bottom-10 h-24 rounded-full bg-signal/20 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">{children}</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
