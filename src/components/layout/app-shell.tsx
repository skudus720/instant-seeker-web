import {
  History,
  LogOut,
  ShieldCheck,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/actions/auth";
import { isStaffRole } from "@/lib/admin/permissions";
import { Logo } from "@/components/ui/logo";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

type AppSection =
  "dashboard" | "plans" | "history" | "profile" | "referrals" | "admin";

const navigation = [
  { key: "plans", href: "/plans", label: "Plans", icon: Sparkles },
  { key: "history", href: "/history", label: "History", icon: History },
] as const;

export function AppShell({
  user,
  current = "dashboard",
  theme = "light",
  children,
}: {
  user: SessionUser;
  current?: AppSection;
  theme?: "light" | "dark";
  children: ReactNode;
}) {
  const dark = theme === "dark";
  const visibleNavigation =
    user.role === "sub_admin"
      ? [
          {
            key: "referrals" as const,
            href: "/referrals",
            label: "Referrals",
            icon: Share2,
          },
        ]
      : navigation;
  return (
    <div
      className={cn(
        "min-h-screen",
        dark ? "bg-ink" : "bg-paper",
        user.role === "sub_admin" && dark && "sub-admin-shell",
      )}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/92 text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[1320px] items-center justify-between gap-5 px-5 sm:px-8">
          <Logo inverse compactOnMobile />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/profile"
              aria-label="Open profile"
              aria-current={current === "profile" ? "page" : undefined}
              title="Profile"
              className={cn(
                "referral-interactive inline-flex min-h-10 items-center gap-2 rounded-full border px-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:px-3",
                current === "profile"
                  ? "border-signal bg-signal text-ink"
                  : "border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.06]",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  current === "profile"
                    ? "bg-ink text-signal"
                    : "bg-signal text-ink",
                )}
              >
                <UserRound className="size-3.5" aria-hidden="true" />
              </span>
              <span className="hidden max-w-36 truncate text-xs font-black sm:block">
                {user.displayName}
              </span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="referral-interactive grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.025] text-white/70 hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1320px] lg:grid-cols-[220px_1fr]">
        <aside
          className={cn(
            "border-b px-2 py-3 lg:min-h-[calc(100vh-4.5rem)] lg:border-r lg:border-b-0 lg:px-5 lg:py-8",
            dark ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white",
          )}
        >
          <nav
            aria-label="Account navigation"
            className={cn(
              "grid w-full gap-1 lg:grid-cols-1",
              user.role === "sub_admin" ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const active = current === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "referral-interactive inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-2 sm:px-3 sm:text-sm lg:justify-start lg:px-4",
                    active
                      ? "bg-signal text-ink shadow-[0_8px_24px_rgba(255,202,39,0.12)] focus-visible:outline-signal"
                      : dark
                        ? "text-white/62 hover:bg-white/7 hover:text-white focus-visible:outline-signal"
                        : "text-ink hover:bg-black/5 focus-visible:outline-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            {isStaffRole(user.role) ? (
              <Link
                href="/admin"
                aria-current={current === "admin" ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-2 sm:px-3 sm:text-sm lg:justify-start lg:px-4",
                  current === "admin"
                    ? "bg-signal text-ink focus-visible:outline-signal"
                    : dark
                      ? "text-white/62 hover:bg-white/7 hover:text-white focus-visible:outline-signal"
                      : "text-ink hover:bg-black/5 focus-visible:outline-ink",
                )}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Admin
              </Link>
            ) : null}
          </nav>
        </aside>
        <main
          id="main-content"
          className={cn(
            "min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10",
            dark && "text-white",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
