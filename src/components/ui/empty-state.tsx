import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = "light",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "grid min-h-52 place-items-center border border-dashed p-8 text-center",
        dark
          ? "border-white/15 bg-white/[0.035]"
          : "border-black/18 bg-black/[0.02]",
      )}
    >
      <div>
        <span
          className={cn(
            "mx-auto mb-4 grid size-11 place-items-center rounded-md text-signal",
            dark ? "bg-signal/10" : "bg-ink",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3
          className={cn(
            "text-base font-bold",
            dark ? "text-white" : "text-ink",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "mx-auto mt-2 max-w-sm text-sm leading-6",
            dark ? "text-white/58" : "text-muted",
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
