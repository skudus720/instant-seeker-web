import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function DisclaimerBanner({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex items-start gap-3 border border-[#ffd400]/35 bg-[#ffd400]/8 text-sm text-white/78",
        compact ? "rounded-md px-4 py-3" : "rounded-lg px-5 py-4",
        className,
      )}
      aria-label="Important analysis disclaimer"
    >
      <ShieldAlert
        className="mt-0.5 size-4 shrink-0 text-[#ffd400]"
        aria-hidden="true"
      />
      <p>
        Probability-based analysis only. No outcome is guaranteed. Instant
        Seeker does not accept bets or handle gambling funds. 18+.
      </p>
    </aside>
  );
}
