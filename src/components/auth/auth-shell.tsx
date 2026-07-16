import type { ReactNode } from "react";
import { ArrowLeft, EyeOff, Hexagon, Target, Wallet } from "lucide-react";
import Link from "next/link";
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
      className="auth-page relative flex min-h-screen w-full flex-col overflow-hidden bg-[#07080A] lg:flex-row"
    >
      {/* Soft Atmospheric Background */}
      <div className="bg-grid-pattern pointer-events-none absolute inset-0"></div>
      <div className="pointer-events-none absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-[#FFCA27] opacity-[0.03] blur-[150px]"></div>
      <div className="pointer-events-none absolute top-[40%] right-[10%] h-[40%] w-[30%] rounded-full bg-[#FFCA27] opacity-[0.02] blur-[120px]"></div>

      {/* =========================================
          LEFT PANEL: BRAND STORY (DESKTOP)
          ========================================= */}
      <div className="relative z-10 hidden w-full flex-col justify-between border-r border-white/5 px-12 py-12 lg:flex lg:w-[45%] xl:w-[40%] xl:px-20 xl:py-16">
        <div className="animate-fade-up space-y-12">
          {/* Logo */}
          <Link href="/" className="group inline-flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Hexagon
                className="absolute h-8 w-8 text-[#FFCA27] opacity-80"
                strokeWidth={1.5}
              />
              <div className="h-2.5 w-2.5 rounded-sm bg-[#FFCA27]"></div>
            </div>
            <span className="font-heading text-2xl font-semibold tracking-wide text-white">
              Instant<span className="text-[#FFCA27]">Seeker</span>
            </span>
          </Link>

          {/* Intro Story */}
          {isSignup ? (
            <div className="max-w-md space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-[#FFCA27]"></div>
                <span className="text-xs font-medium tracking-wide text-[#94A3B8] uppercase">
                  AI-Powered Analysis · 18+
                </span>
              </div>

              <h1 className="font-heading text-4xl leading-[1.15] font-semibold text-white xl:text-5xl">
                Set up your private analysis workspace.
              </h1>

              <p className="text-lg leading-relaxed text-[#94A3B8]">
                Pay once with Mobile Money, upload your match screenshots, and
                let our intelligence refine your selections.
              </p>
            </div>
          ) : (
            <div className="max-w-md space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-[#FFCA27]"></div>
                <span className="text-xs font-medium tracking-wide text-[#94A3B8] uppercase">
                  AI-Powered Analysis · Member Access
                </span>
              </div>

              <h1 className="font-heading text-4xl leading-[1.15] font-semibold text-white xl:text-5xl">
                Welcome back to your workspace.
              </h1>

              <p className="text-lg leading-relaxed text-[#94A3B8]">
                Log in to review your private reports, upload new screenshots,
                and continue analyzing selections.
              </p>
            </div>
          )}

          {/* Bullet Points */}
          <div className="space-y-6 pt-6">
            {[
              {
                icon: EyeOff,
                title: "Screenshot Privacy",
                desc: "Your uploads are analyzed instantly and never stored permanently.",
              },
              {
                icon: Wallet,
                title: isSignup ? "Mobile Money Access" : "Secure Workspace",
                desc: isSignup
                  ? "Secure, seamless GHS transactions supported natively."
                  : "Access your private workspace and reports securely.",
              },
              {
                icon: Target,
                title: isSignup ? "Responsible Estimates" : "Logical Choices",
                desc: isSignup
                  ? "Data-driven pattern recognition, tailored for logical decisions."
                  : "Get analytical insights based on historical match patterns.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/5 bg-[#101216] text-[#FFCA27]">
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-heading mb-1 text-base font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#94A3B8]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="animate-fade-up mt-12 border-t border-white/5 pt-8 delay-200">
          <p className="text-xs leading-relaxed text-[#64748B]">
            Estimates only. Instant Seeker provides analytical perspectives
            based on historical patterns. The user remains entirely responsible
            for all final decisions and actions.
          </p>
        </div>
      </div>

      {/* =========================================
          RIGHT PANEL: AUTHENTICATION FORM CARD
          ========================================= */}
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 lg:max-w-none lg:p-12">
        {/* Float Home Link for Quick Navigation */}
        <div className="absolute top-6 right-6 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-[#101216] px-3.5 py-1.5 text-xs text-[#94A3B8] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft className="size-3 text-[#94A3B8]" aria-hidden="true" />
            Back to Home
          </Link>
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="animate-fade-up mb-8 w-full max-w-md lg:hidden">
          <Link href="/" className="group mb-8 inline-flex items-center gap-3">
            <div className="relative flex h-7 w-7 items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Hexagon
                className="absolute h-7 w-7 text-[#FFCA27] opacity-80"
                strokeWidth={1.5}
              />
              <div className="h-2 w-2 rounded-sm bg-[#FFCA27]"></div>
            </div>
            <span className="font-heading text-xl font-semibold tracking-wide text-white">
              Instant<span className="text-[#FFCA27]">Seeker</span>
            </span>
          </Link>
          <h1 className="font-heading mb-3 text-3xl font-semibold text-white">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-[#94A3B8]">{description}</p>
        </div>

        {/* Banners & Notices */}
        {isDemoMode ? (
          <div
            className="mb-4 w-full max-w-md rounded-xl border border-[#FFCA27]/30 bg-[#FFCA27]/10 px-4 py-3 text-xs font-semibold text-[#FFCA27]"
            role="status"
          >
            Demo mode: forms can be previewed, but no account is stored and no
            payment is collected.
          </div>
        ) : null}

        {notice ? (
          <div
            className="mb-4 w-full max-w-md rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-200"
            role="status"
          >
            {notice}
          </div>
        ) : null}

        {/* Form Card */}
        <div className="animate-fade-up w-full max-w-md rounded-2xl border border-white/5 bg-[#101216] p-6 shadow-2xl delay-100 md:p-8">
          <div className="mb-8 hidden lg:block">
            <h2 className="font-heading text-2xl font-semibold text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              {description}
            </p>
          </div>

          {children}
        </div>

        {/* Mobile Trust Points & Note (Hidden on Desktop) */}
        <div className="animate-fade-up mt-12 w-full max-w-md space-y-8 delay-200 lg:hidden">
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: EyeOff, title: "Screenshot Privacy" },
              {
                icon: Wallet,
                title: isSignup ? "Mobile Money Access" : "Secure Workspace",
              },
              {
                icon: Target,
                title: isSignup ? "Responsible Estimates" : "Logical Choices",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#101216]/50 p-3"
              >
                <item.icon
                  size={16}
                  className="text-[#FFCA27]"
                  strokeWidth={2}
                />
                <span className="text-sm font-medium text-white">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] leading-relaxed text-[#64748B]">
            Estimates only. Instant Seeker provides analytical perspectives
            based on historical patterns. The user remains entirely responsible
            for all final decisions.
          </p>
        </div>
      </div>
    </main>
  );
}
