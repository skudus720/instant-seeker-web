import { LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { isDemoMode } from "@/lib/config";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="min-h-screen bg-[#f4f5f0]">
      <div className="grid min-h-screen lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="data-grid relative hidden overflow-hidden bg-[#090909] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Logo inverse />
          <div className="relative z-10 max-w-md">
            <p className="text-xs font-black text-[#ffd400] uppercase">
              Private by design
            </p>
            <h2 className="mt-5 text-5xl leading-none font-black">
              Your screenshots are analysis inputs, not public content.
            </h2>
            <div className="mt-9 grid gap-4 text-sm text-white/62">
              <p className="flex items-center gap-3">
                <LockKeyhole
                  className="size-4 text-[#ffd400]"
                  aria-hidden="true"
                />
                Private storage with account-scoped access
              </p>
              <p className="flex items-center gap-3">
                <ShieldCheck
                  className="size-4 text-[#82f6b3]"
                  aria-hidden="true"
                />
                No bets, funds, or guaranteed outcomes
              </p>
            </div>
          </div>
          <p className="relative z-10 text-xs text-white/35">
            Independent service · Not endorsed by any betting platform · 18+
          </p>
        </aside>
        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo />
            </div>
            <Link
              href="/"
              className="rounded-sm text-sm font-bold text-black/55 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black"
            >
              Back home
            </Link>
          </div>
          <div className="mx-auto my-auto w-full max-w-[520px] py-12">
            {isDemoMode ? (
              <p
                className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
                role="status"
              >
                Demo mode is active. Forms are validated, but account details
                are not stored.
              </p>
            ) : null}
            <h1 className="text-4xl font-black text-[#090909] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-black/55">
              {description}
            </p>
            <div className="mt-9">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
