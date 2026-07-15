import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ReferralMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  dark = true,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  dark?: boolean;
}) {
  const toneClass = {
    default: dark
      ? "border-signal/15 bg-signal/10 text-signal"
      : "border-black/10 bg-ink text-signal",
    success: dark
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-signal/30 bg-signal text-ink",
    danger: dark
      ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
      : "border-rose-200 bg-rose-50 text-rose-800",
  }[tone];
  return (
    <article
      className={cn(
        "referral-card group relative min-w-0 overflow-hidden rounded-lg border p-5",
        dark
          ? "referral-card-dark border-white/10 bg-[#111111] text-white"
          : "referral-card-light border-black/10 bg-white text-ink",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[11px] leading-4 font-black uppercase",
            dark ? "text-white/42" : "text-black/42",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg border transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none",
            toneClass,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-6 text-2xl leading-tight font-black break-words tabular-nums">
        {value}
      </p>
      {detail ? (
        <p
          className={cn(
            "mt-2 min-h-5 text-xs leading-5",
            dark ? "text-white/38" : "text-black/42",
          )}
        >
          {detail}
        </p>
      ) : null}
    </article>
  );
}

export function ReferralStatusBadge({
  status,
  dark = false,
}: {
  status: string;
  dark?: boolean;
}) {
  const success = ["available", "paid", "active", "earning"].includes(status);
  const danger = [
    "reversed",
    "refund_reversal",
    "chargeback_reversal",
  ].includes(status);
  const warning = status === "pending";
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black whitespace-nowrap capitalize",
        success
          ? dark
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
          : danger
            ? dark
              ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
              : "border-rose-200 bg-rose-50 text-rose-800"
            : warning
              ? dark
                ? "border-signal/25 bg-signal/10 text-signal"
                : "border-amber-200 bg-amber-50 text-amber-900"
              : dark
                ? "border-white/12 bg-white/5 text-white/55"
                : "border-black/10 bg-black/5 text-black/60",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          success
            ? "bg-emerald-500"
            : danger
              ? "bg-rose-500"
              : warning
                ? "bg-signal"
                : "bg-neutral-400",
        )}
        aria-hidden="true"
      />
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function ReferralPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="referral-panel overflow-hidden rounded-lg border border-white/10 bg-[#111111]">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.018] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-white">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-white/40">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
