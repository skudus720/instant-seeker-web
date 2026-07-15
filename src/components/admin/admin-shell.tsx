"use client";

import {
  Bell,
  ChevronRight,
  Command,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { signOutAction } from "@/actions/auth";
import { adminNavigation } from "@/lib/admin/navigation";
import { roleHasPermission } from "@/lib/admin/permissions";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { AdminRealtimeBridge } from "@/components/admin/admin-realtime-bridge";
import { AdminPageTransition } from "@/components/admin/admin-motion";

function AdminBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-xs text-black/50">
        <li>
          <Link className="font-bold hover:text-black" href="/admin">
            Admin
          </Link>
        </li>
        {parts.map((part, index) => {
          const href = `/admin/${parts.slice(0, index + 1).join("/")}`;
          const label = decodeURIComponent(part).replaceAll("-", " ");
          return (
            <li key={href} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
              {index === parts.length - 1 ? (
                <span className="truncate font-bold text-black capitalize">
                  {label}
                </span>
              ) : (
                <Link
                  className="truncate capitalize hover:text-black"
                  href={href}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CommandMenu({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const items = useMemo(
    () =>
      adminNavigation
        .filter((item) => roleHasPermission(user.role, item.permission))
        .filter((item) =>
          `${item.label} ${item.keywords}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
    [query, user.role],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Admin command menu"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="admin-dialog m-auto w-[min(42rem,calc(100%-2rem))] rounded-lg border border-black/15 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
    >
      <div className="flex items-center gap-3 border-b border-black/10 bg-black/[0.015] px-4">
        <Search className="size-5 text-black/40" aria-hidden="true" />
        <label htmlFor="admin-command-search" className="sr-only">
          Search admin destinations
        </label>
        <input
          ref={inputRef}
          id="admin-command-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages and tools"
          className="min-h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close command menu"
          className="grid size-9 place-items-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="admin-interactive flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-bold hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
            >
              <item.icon
                className="size-4 text-signal-ink"
                aria-hidden="true"
              />
              {item.label}
            </Link>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-sm text-black/50">
            No matching admin destination.
          </p>
        )}
      </div>
      <p className="border-t border-black/10 px-4 py-3 text-xs text-black/45">
        Results are limited to your current permissions.
      </p>
    </dialog>
  );
}

export function AdminShell({
  user,
  notificationCount,
  children,
}: {
  user: SessionUser;
  notificationCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const permittedNavigation = adminNavigation.filter((item) =>
    roleHasPermission(user.role, item.permission),
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const navigation = (
    <>
      <div className="flex min-h-18 items-center justify-between border-b border-white/10 px-4">
        <div className={cn(collapsed && "lg:hidden")}>
          <Logo inverse compactOnMobile={false} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="admin-interactive hidden size-9 place-items-center rounded-full border border-white/12 text-white/65 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal lg:grid"
          aria-label={
            collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"
          }
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="admin-interactive grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal lg:hidden"
          aria-label="Close admin navigation"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <nav
        aria-label="Admin navigation"
        className="admin-sidebar-scroll flex-1 space-y-1 overflow-y-auto p-3"
      >
        {permittedNavigation.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "admin-interactive admin-nav-item relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
                active
                  ? "admin-nav-active bg-white/10 text-white"
                  : "text-white/62 hover:bg-white/7 hover:text-white",
                collapsed && "lg:justify-center lg:px-0",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", collapsed && "lg:sr-only")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div
          className={cn(
            "rounded-md border border-white/10 bg-white/[0.035] p-3",
            collapsed && "lg:grid lg:place-items-center lg:p-2",
          )}
        >
          <ShieldCheck className="size-4 text-signal" aria-hidden="true" />
          <p
            className={cn(
              "mt-2 text-xs font-bold text-white",
              collapsed && "lg:sr-only",
            )}
          >
            {user.role === "super_admin"
              ? "Super administrator"
              : "Administrator"}
          </p>
          <p
            className={cn(
              "mt-1 text-xs text-white/45",
              collapsed && "lg:sr-only",
            )}
          >
            Server-authorized session
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-app min-h-screen bg-[#f5f5f2] text-ink">
      <AdminRealtimeBridge disabled={user.demo} />
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none",
          collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[264px_1fr]",
        )}
      >
        <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-white/8 bg-ink text-white lg:flex">
          {navigation}
        </aside>
        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              className="fixed inset-0 z-50 lg:hidden"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <button
                className="absolute inset-0 bg-black/68"
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-white/10 bg-ink text-white shadow-2xl"
                initial={reduceMotion ? false : { x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{
                  duration: reduceMotion ? 0 : 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {navigation}
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-black/8 bg-white/88 shadow-[0_1px_0_rgba(0,0,0,0.025)] backdrop-blur-xl">
            <div className="flex min-h-18 items-center gap-3 px-4 sm:px-6 xl:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="admin-interactive grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-white hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:hidden"
                aria-label="Open admin navigation"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <AdminBreadcrumbs />
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="admin-interactive hidden min-h-10 min-w-52 items-center gap-2 rounded-full border border-black/10 bg-black/[0.025] px-3 text-left text-xs text-black/45 hover:border-black/20 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:flex"
                >
                  <Search className="size-4" aria-hidden="true" />
                  <span className="flex-1">Search admin</span>
                  <span className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-1.5 py-0.5 font-bold text-black/50">
                    <Command className="size-3" aria-hidden="true" />K
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="admin-interactive grid size-10 place-items-center rounded-full border border-black/10 bg-white hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
                  aria-label="Search admin"
                >
                  <Search className="size-4" aria-hidden="true" />
                </button>
                <Link
                  href="/admin/system-health"
                  className="admin-interactive relative grid size-10 place-items-center rounded-full border border-black/10 bg-white hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  aria-label={`${notificationCount} unresolved system notifications`}
                  title="System notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                  {notificationCount > 0 ? (
                    <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-white bg-alert px-1 text-[10px] leading-4 font-black text-white">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  ) : null}
                </Link>
                <details className="relative">
                  <summary className="admin-interactive flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-black/10 bg-white pr-3 pl-1 hover:bg-black/[0.025] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                    <span className="grid size-8 place-items-center rounded-full bg-ink text-signal">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                    <span className="hidden max-w-28 truncate text-xs font-black sm:block">
                      {user.displayName}
                    </span>
                  </summary>
                  <div className="admin-menu absolute right-0 mt-2 w-64 rounded-lg border border-black/10 bg-white p-2 shadow-xl">
                    <div className="border-b border-black/10 px-3 py-3">
                      <p className="truncate text-sm font-black">
                        {user.displayName}
                      </p>
                      <p className="mt-1 truncate text-xs text-black/45">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="admin-interactive mt-2 flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                    >
                      <UserRound className="size-4" aria-hidden="true" />
                      Account profile
                    </Link>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="admin-interactive flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-alert hover:bg-alert/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-alert"
                      >
                        <LogOut className="size-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            </div>
          </header>
          {user.demo ? (
            <div className="border-b border-signal/50 bg-signal-soft px-4 py-2 text-center text-xs font-bold text-signal-ink">
              Demo admin preview. Data is empty and administrative mutations are
              disabled.
            </div>
          ) : null}
          <main
            id="main-content"
            className="min-w-0 px-4 py-7 sm:px-6 xl:px-8 xl:py-9"
          >
            <AdminPageTransition>{children}</AdminPageTransition>
          </main>
        </div>
      </div>
      <CommandMenu
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        user={user}
      />
    </div>
  );
}
