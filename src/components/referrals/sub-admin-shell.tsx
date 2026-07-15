import {
  ChartNoAxesCombined,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  ReceiptText,
  ScanSearch,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/ui/logo";
import { appConfig } from "@/lib/config";
import type { SessionUser } from "@/lib/types";

export function SubAdminShell({
  user,
  clientCount,
  payingClientCount,
  transactionCount,
  children,
}: {
  user: SessionUser;
  clientCount: number;
  payingClientCount: number;
  transactionCount: number;
  children: ReactNode;
}) {
  const tabs = [
    {
      label: "Overview",
      href: "#overview",
      icon: LayoutDashboard,
      current: true,
    },
    {
      label: `Clients (${clientCount.toLocaleString()})`,
      href: "#audience",
      icon: UsersRound,
    },
    {
      label: `Paid users (${payingClientCount.toLocaleString()})`,
      href: "#audience",
      icon: CreditCard,
    },
    {
      label: `Referral transactions (${transactionCount.toLocaleString()})`,
      href: "#transactions",
      icon: ReceiptText,
    },
    {
      label: "Support",
      href: `mailto:${appConfig.contactEmail}`,
      icon: LifeBuoy,
    },
  ];

  return (
    <div className="sub-admin-dashboard min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-[#151517]">
        <div className="mx-auto max-w-[1200px] px-5 pt-5 sm:px-8 sm:pt-7">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Logo inverse compactOnMobile />
              <Link
                href="/referrals/virtuals-ai"
                className="referral-interactive inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-signal/35 bg-signal/[0.08] px-3 text-[11px] font-black text-signal uppercase hover:border-signal/65 hover:bg-signal/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:px-4 sm:text-xs"
                aria-label="Open Virtuals AI analysis workspace"
              >
                <ScanSearch className="size-3.5" aria-hidden="true" />
                Virtuals AI
              </Link>
            </div>
            <Link
              href="/profile"
              className="referral-interactive inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.035] px-2.5 text-xs font-black text-white hover:border-white/25 hover:bg-white/[0.065] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:px-3"
              aria-label="Open sub-admin profile"
            >
              <span className="grid size-7 place-items-center rounded-full bg-signal text-ink">
                <UserRound className="size-3.5" aria-hidden="true" />
              </span>
              <span className="hidden max-w-40 truncate sm:block">
                {user.displayName}
              </span>
            </Link>
          </div>

          <div className="py-9 sm:py-11">
            <p className="text-xs font-black text-signal uppercase">
              Partner administration
            </p>
            <h1 className="mt-3 text-3xl leading-tight font-black text-white uppercase sm:text-5xl">
              Instant Seeker Admin
            </h1>
            <p className="mt-2 text-lg text-white/52 sm:text-xl">
              Referral administration dashboard
            </p>
            <p className="mt-3 text-sm font-bold break-all text-signal/80 sm:break-normal">
              Sub-admin · {user.email}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="referral-interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-signal px-5 text-sm font-black text-ink shadow-[0_10px_26px_rgba(255,202,39,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                <ChartNoAxesCombined className="size-4" aria-hidden="true" />
                View results
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="referral-interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.025] px-5 text-sm font-black text-white hover:border-white/32 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 bg-[#111113]">
          <div className="mx-auto max-w-[1200px] overflow-x-auto px-5 py-3 sm:px-8">
            <nav
              aria-label="Sub-admin dashboard sections"
              className="flex min-w-max gap-2"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <a
                    key={tab.label}
                    href={tab.href}
                    aria-current={tab.current ? "page" : undefined}
                    className={`referral-interactive inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                      tab.current
                        ? "bg-signal text-ink"
                        : "border border-white/8 bg-white/[0.045] text-white/65 hover:border-white/18 hover:text-white"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {tab.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main id="main-content" className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
