import { cn } from "@/lib/utils";
import type { ConfidenceLevel, RiskLevel } from "@/lib/types";

const styles = {
  low: "border-emerald-300 bg-emerald-50 text-emerald-800",
  medium: "border-amber-300 bg-amber-50 text-amber-900",
  high: "border-rose-300 bg-rose-50 text-rose-800",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize",
        styles[level],
      )}
    >
      {level} risk
    </span>
  );
}

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className="inline-flex rounded-full border border-black/15 bg-white px-2.5 py-1 text-xs font-bold text-muted capitalize">
      {level} confidence
    </span>
  );
}
