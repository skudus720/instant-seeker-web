import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  inverse = false,
  compactOnMobile = false,
}: {
  inverse?: boolean;
  compactOnMobile?: boolean;
}) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
      aria-label="Instant Seeker home"
    >
      <span
        className="grid size-9 place-items-center rounded-md border border-signal/70 bg-signal font-black text-ink shadow-[0_0_22px_rgba(255,202,39,0.18)] transition-transform group-hover:-rotate-3"
        aria-hidden="true"
      >
        IS
      </span>
      <span
        className={cn(
          "text-base font-black tracking-[0]",
          inverse ? "text-white" : "text-ink",
          compactOnMobile && "hidden sm:inline",
        )}
      >
        Instant Seeker
      </span>
    </Link>
  );
}
