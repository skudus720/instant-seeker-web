"use client";

import { LayoutDashboard, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const menuLinks = [
  { href: "/referrals", label: "Referral dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function VirtualsAiMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="referral-interactive grid size-10 place-items-center rounded-full text-white/68 hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        aria-label={open ? "Close workspace menu" : "Open workspace menu"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <nav
          className="virtuals-ai-menu absolute top-12 left-0 z-50 w-56 rounded-lg border border-white/12 bg-[#171719] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.48)]"
          aria-label="Virtuals AI workspace menu"
          role="menu"
        >
          {menuLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-white/68 hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal"
                role="menuitem"
              >
                <Icon className="size-4 text-signal" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
