import { History, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/ui/logo";
import type { SessionUser } from "@/lib/types";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f5f0]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[1320px] items-center justify-between gap-5 px-5 sm:px-8">
          <Logo inverse />
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-bold text-white">
                {user.displayName}
              </span>
              <span className="block text-[11px] text-white/40">
                {user.demo ? "Demo workspace" : "Private workspace"}
              </span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="grid size-10 place-items-center rounded-md border border-white/15 text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-[#ffd400]"
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
        <aside className="border-b border-black/10 bg-white px-5 py-3 lg:min-h-[calc(100vh-4.5rem)] lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
          <nav aria-label="Account navigation" className="flex gap-2 lg:grid">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold text-[#090909] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#090909]"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/history"
              className="inline-flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold text-[#090909] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#090909]"
            >
              <History className="size-4" aria-hidden="true" />
              History
            </Link>
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold text-[#090909] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#090909]"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Admin
              </Link>
            ) : null}
          </nav>
        </aside>
        <main
          id="main-content"
          className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
