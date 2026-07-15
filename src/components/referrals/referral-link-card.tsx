"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ReferralLinkCard({
  code,
  url,
  enabled,
  attributionDays = 30,
  commissionRateBasisPoints = 7000,
  variant = "dark",
}: {
  code: string;
  url: string;
  enabled: boolean;
  attributionDays?: number;
  commissionRateBasisPoints?: number;
  variant?: "dark" | "light";
}) {
  const [copied, setCopied] = useState(false);
  const dark = variant === "dark";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      className={cn(
        "referral-card referral-link-card overflow-hidden rounded-lg border",
        dark
          ? "referral-card-dark border-signal/20 bg-[#111111]"
          : "referral-card-light border-black/10 bg-white shadow-sm",
      )}
      aria-labelledby="referral-link-title"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b px-5 py-5 sm:px-6",
          dark
            ? "border-white/10 bg-white/[0.018]"
            : "border-black/8 bg-black/[0.012]",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg border",
              dark
                ? "border-signal/25 bg-signal text-ink shadow-[0_8px_24px_rgba(255,202,39,0.12)]"
                : "border-black/10 bg-ink text-signal",
            )}
          >
            <Link2 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="referral-link-title" className="text-sm font-black">
              Your referral link
            </h2>
            <p
              className={cn(
                "mt-1 text-xs",
                dark ? "text-white/42" : "text-black/45",
              )}
            >
              First valid referral attribution lasts {attributionDays} days.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black",
            enabled
              ? dark
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
              : dark
                ? "border-white/12 bg-white/5 text-white/45"
                : "border-black/10 bg-black/5 text-black/50",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              enabled ? "bg-emerald-500" : "bg-neutral-400",
            )}
            aria-hidden="true"
          />
          {enabled ? "Active" : "Disabled"}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <label
          htmlFor="referral-url"
          className={cn(
            "text-[11px] font-black uppercase",
            dark ? "text-white/42" : "text-black/42",
          )}
        >
          Referral URL
        </label>
        <div className="mt-2.5 flex flex-col gap-3 sm:flex-row">
          <input
            id="referral-url"
            value={url}
            readOnly
            className={cn(
              "min-h-12 min-w-0 flex-1 rounded-lg border px-4 font-mono text-xs transition-[border-color,box-shadow] duration-200 outline-none",
              dark
                ? "border-white/14 bg-black text-white/72 hover:border-white/25 focus:border-signal focus:ring-2 focus:ring-signal/10"
                : "border-black/12 bg-black/[0.018] text-black/65 focus:border-black",
            )}
          />
          <button
            type="button"
            onClick={copyLink}
            disabled={!enabled}
            className={cn(
              "referral-interactive inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transform-none motion-reduce:transition-none",
              dark
                ? copied
                  ? "bg-emerald-400 text-ink focus-visible:outline-emerald-300"
                  : "bg-signal text-ink shadow-[0_8px_24px_rgba(255,202,39,0.12)] focus-visible:outline-signal"
                : "bg-ink text-white focus-visible:outline-ink",
            )}
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <div
          className={cn(
            "mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-5 text-xs",
            dark
              ? "border-white/8 text-white/45"
              : "border-black/8 text-black/45",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            Referral code:{" "}
            <strong
              className={cn(
                "rounded-full border px-2 py-1 font-mono text-[11px]",
                dark
                  ? "border-white/12 bg-white/5 text-white"
                  : "border-black/10 bg-black/5 text-ink",
              )}
            >
              {code}
            </strong>
          </span>
          <span>
            Commission:{" "}
            <strong className={dark ? "text-signal" : "text-signal-ink"}>
              {(commissionRateBasisPoints / 100).toLocaleString("en-GH", {
                maximumFractionDigits: 2,
              })}
              % of profit
            </strong>
          </span>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Referral link copied to clipboard." : ""}
        </p>
      </div>
    </section>
  );
}
