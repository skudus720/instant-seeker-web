"use client";

import {
  Bell,
  ChevronRight,
  Command,
  Hexagon,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
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
import { AdminRealtimeBridge } from "@/components/admin/admin-realtime-bridge";
import { AdminPageTransition } from "@/components/admin/admin-motion";

function AdminBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-xs text-white/42">
        <li>
          <Link className="font-bold hover:text-white" href="/admin">
            Instant Seeker
          </Link>
        </li>
        {parts.map((part, index) => {
          const href = `/admin/${parts.slice(0, index + 1).join("/")}`;
          const label = decodeURIComponent(part).replaceAll("-", " ");
          return (
            <li key={href} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
              {index === parts.length - 1 ? (
                <span className="truncate font-bold text-white capitalize">
                  {label}
                </span>
              ) : (
                <Link
                  className="truncate capitalize hover:text-white"
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
      className="admin-dialog m-auto w-[min(42rem,calc(100%-2rem))] rounded-lg border border-white/10 bg-[#101216] p-0 text-white shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.015] px-4">
        <Search className="size-5 text-white/40" aria-hidden="true" />
        <label htmlFor="admin-command-search" className="sr-only">
          Search admin destinations
        </label>
        <input
          ref={inputRef}
          id="admin-command-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages and tools"
          className="min-h-14 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close command menu"
          className="grid size-9 place-items-center rounded-full text-white/55 hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
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
              className="admin-interactive flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-bold text-white/72 hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal"
            >
              <item.icon className="size-4 text-signal" aria-hidden="true" />
              {item.label}
            </Link>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-sm text-white/45">
            No matching admin destination.
          </p>
        )}
      </div>
      <p className="border-t border-white/8 px-4 py-3 text-xs text-white/38">
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
      <div className="flex min-h-18 items-center justify-between border-b border-white/8 px-4">
        <div
          className={cn("flex items-center gap-3", collapsed && "lg:hidden")}
        >
          <span className="relative grid size-8 place-items-center text-signal">
            <Hexagon className="absolute inset-0 size-8" strokeWidth={1.5} />
            <span className="size-2 rounded-sm bg-signal" />
          </span>
          <span className="text-lg font-black tracking-wide text-white">
            Seeker<span className="text-signal">OS</span>
          </span>
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
      <div className={cn("px-4 pt-4", collapsed && "lg:hidden")}>
        <span className="flex min-h-8 items-center justify-center rounded-md border border-signal/18 bg-signal/8 px-3 text-[10px] font-black tracking-wide text-signal uppercase">
          {user.role === "super_admin"
            ? "Super Admin Privileges"
            : "Admin Privileges"}
        </span>
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
      <div className="border-t border-white/8 p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.025] p-3",
            collapsed && "lg:grid lg:place-items-center lg:p-2",
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-signal text-xs font-black text-ink">
            {user.displayName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "SA"}
          </span>
          <div className={cn("min-w-0", collapsed && "lg:sr-only")}>
            <p className="truncate text-xs font-bold text-white">
              {user.displayName}
            </p>
            <p className="mt-1 truncate text-[10px] text-white/38">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-app min-h-screen bg-[#07080A] text-white">
      <AdminRealtimeBridge disabled={user.demo} />
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none",
          collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[264px_1fr]",
        )}
      >
        <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-white/8 bg-[#07080A] text-white lg:flex">
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
                className="absolute inset-0 bg-black/78 backdrop-blur-sm"
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-white/10 bg-[#07080A] text-white shadow-2xl"
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
          <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07080A]/88 shadow-[0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-xl">
            <div className="flex min-h-18 items-center gap-3 px-4 sm:px-6 xl:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="admin-interactive grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-white/65 hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal lg:hidden"
                aria-label="Open admin navigation"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <AdminBreadcrumbs />
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="admin-interactive hidden min-h-10 min-w-56 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 text-left text-xs text-white/38 hover:border-white/15 hover:bg-white/5 hover:text-white/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal md:flex"
                >
                  <Search className="size-4" aria-hidden="true" />
                  <span className="flex-1">Search admin</span>
                  <span className="inline-flex items-center gap-1 rounded border border-white/8 bg-white/[0.035] px-1.5 py-0.5 font-bold text-white/45">
                    <Command className="size-3" aria-hidden="true" />K
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="admin-interactive grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-white/65 hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal md:hidden"
                  aria-label="Search admin"
                >
                  <Search className="size-4" aria-hidden="true" />
                </button>
                <Link
                  href="/admin/system-health"
                  className="admin-interactive relative grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-white/65 hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  aria-label={`${notificationCount} unresolved system notifications`}
                  title="System notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                  {notificationCount > 0 ? (
                    <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-[#07080A] bg-alert px-1 text-[10px] leading-4 font-black text-white">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  ) : null}
                </Link>
                <details className="relative">
                  <summary className="admin-interactive flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] pr-3 pl-1 text-white hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal">
                    <span className="grid size-8 place-items-center rounded-md bg-signal text-ink">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                    <span className="hidden max-w-28 truncate text-xs font-black sm:block">
                      {user.displayName}
                    </span>
                  </summary>
                  <div className="admin-menu absolute right-0 mt-2 w-64 rounded-lg border border-white/10 bg-[#101216] p-2 text-white shadow-xl">
                    <div className="border-b border-white/8 px-3 py-3">
                      <p className="truncate text-sm font-black">
                        {user.displayName}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/40">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="admin-interactive mt-2 flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal"
                    >
                      <UserRound className="size-4" aria-hidden="true" />
                      Account profile
                    </Link>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="admin-interactive flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-alert hover:bg-alert/8 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-alert"
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
            className="admin-workspace min-w-0 px-4 py-7 sm:px-6 xl:px-8 xl:py-9"
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
