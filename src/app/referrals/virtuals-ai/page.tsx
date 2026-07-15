import type { Metadata } from "next";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { VirtualsAiWorkspace } from "@/components/referrals/virtuals-ai-workspace";
import { VirtualsAiMenu } from "@/components/referrals/virtuals-ai-menu";
import { requireSubAdmin } from "@/lib/auth";
import { analysisProviderConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Virtuals AI",
  description:
    "Private screenshot analysis workspace for Instant Seeker sub-admin partners.",
};
export const dynamic = "force-dynamic";

export default async function VirtualsAiPage() {
  const user = await requireSubAdmin();
  const demoMode = user.demo || analysisProviderConfig.provider === "demo";

  return (
    <div className="virtuals-ai-page min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080808]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[760px] items-center gap-1 px-3 sm:gap-2 sm:px-7">
          <Link
            href="/referrals"
            className="referral-interactive grid size-10 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            aria-label="Back to referral dashboard"
            title="Back to referral dashboard"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>

          <VirtualsAiMenu />

          <div className="flex min-w-0 flex-1 items-center pl-1">
            <p className="truncate text-sm font-black sm:text-base">
              Virtuals <span className="text-signal">AI</span>
            </p>
          </div>

          <span
            className={
              demoMode
                ? "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-300/8 px-2.5 text-[10px] font-black text-amber-200 sm:px-3 sm:text-[11px]"
                : "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/8 px-2.5 text-[10px] font-black text-emerald-200 sm:px-3 sm:text-[11px]"
            }
            role="status"
          >
            <span
              className={`size-1.5 rounded-full ${demoMode ? "bg-amber-300" : "animate-pulse bg-emerald-300 motion-reduce:animate-none"}`}
              aria-hidden="true"
            />
            {demoMode ? "Demo" : "Live"}
          </span>

          <form action={signOutAction}>
            <button
              type="submit"
              className="referral-interactive grid size-10 place-items-center rounded-full border border-white/14 bg-white/[0.035] text-white/72 hover:border-white/28 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:flex sm:w-auto sm:px-4"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden text-xs font-black sm:ml-2 sm:inline">
                Sign out
              </span>
            </button>
          </form>
        </div>
      </header>

      <VirtualsAiWorkspace demoMode={demoMode} />
    </div>
  );
}
