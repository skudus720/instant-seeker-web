"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Logo } from "@/components/ui/logo";

const navigation = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Results", href: "/#results" },
  { label: "Reviews", href: "/#reviews" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const focusFrame = open
      ? window.requestAnimationFrame(() =>
          dialogRef.current?.querySelector<HTMLElement>("a")?.focus(),
        )
      : 0;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !open) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("a, button"),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/88 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Logo inverse />
        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-sm text-sm font-semibold text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd400]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="rounded-md px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd400]"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-[#ffd400] px-5 py-2.5 text-sm font-black text-[#090909] shadow-[0_0_24px_rgba(255,212,0,0.16)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white active:translate-y-0"
          >
            Get Started
          </Link>
        </div>
        <button
          ref={triggerRef}
          type="button"
          className="grid size-11 place-items-center rounded-md border border-white/15 text-white sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {open ? (
        <div
          ref={dialogRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          onKeyDown={trapFocus}
          className="fixed inset-x-0 top-18 min-h-[calc(100dvh-4.5rem)] border-t border-white/10 bg-[#090909] px-5 py-8 sm:hidden"
        >
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 px-2 py-4 text-lg font-bold text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-5 rounded-md border border-white/20 px-5 py-3.5 text-center font-bold"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-md bg-[#ffd400] px-5 py-3.5 text-center font-black text-[#090909]"
            >
              Get Started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
