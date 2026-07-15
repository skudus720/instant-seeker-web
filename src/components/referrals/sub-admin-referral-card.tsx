"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

export interface SubAdminCurrencySummary {
  currency: string;
  referredRevenue: string;
  commissionEarned: string;
  pendingCommission: string;
  availableBalance: string;
  totalPaid: string;
  recoverableBalance: string;
}

export function SubAdminReferralCard({
  code,
  url,
  enabled,
  clientCount,
  payingClientCount,
  attributionDays,
  commissionRateBasisPoints,
  currencySummaries,
}: {
  code: string;
  url: string;
  enabled: boolean;
  clientCount: number;
  payingClientCount: number;
  attributionDays: number;
  commissionRateBasisPoints: number;
  currencySummaries: SubAdminCurrencySummary[];
}) {
  const [copied, setCopied] = useState(false);

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
      className="referral-card referral-card-dark overflow-hidden rounded-lg border border-white/12 bg-[#151517]"
      aria-labelledby="my-referral-title"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/9 bg-white/[0.018] px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-signal text-ink">
            <Link2 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="my-referral-title" className="text-xl font-black">
              My referral
            </h2>
            <p className="mt-1 text-xs text-white/42">
              First-valid attribution lasts {attributionDays} days.
            </p>
          </div>
        </div>
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 text-[11px] font-black text-white/50">
          <span
            className={`size-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-neutral-500"}`}
            aria-hidden="true"
          />
          {enabled ? "Active" : "Disabled"}
        </span>
      </div>

      <div className="p-5 sm:p-7">
        <label
          htmlFor="sub-admin-referral-url"
          className="text-[11px] font-black text-white/42 uppercase"
        >
          Referral URL
        </label>
        <input
          id="sub-admin-referral-url"
          value={url}
          readOnly
          className="mt-2.5 min-h-12 w-full rounded-lg border border-white/14 bg-black px-4 font-mono text-xs text-white/72 outline-none focus:border-signal focus:ring-2 focus:ring-signal/10"
        />
        <button
          type="button"
          onClick={copyLink}
          disabled={!enabled}
          className={`referral-interactive mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
            copied
              ? "bg-emerald-400 text-ink focus-visible:outline-emerald-300"
              : "border border-white/14 bg-white/[0.065] text-white hover:border-white/25 hover:bg-white/[0.095] focus-visible:outline-signal"
          }`}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Link copied" : "Copy link"}
        </button>

        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/9 pt-5 text-sm text-white/48">
          <span>
            Invite code:{" "}
            <strong className="font-mono text-white">{code}</strong>
          </span>
          <span>
            Clients:{" "}
            <strong className="text-white">
              {clientCount.toLocaleString()}
            </strong>
          </span>
          <span>
            Paying clients:{" "}
            <strong className="text-white">
              {payingClientCount.toLocaleString()}
            </strong>
          </span>
          <span>
            Commission:{" "}
            <strong className="text-signal">
              {(commissionRateBasisPoints / 100).toLocaleString("en-GH", {
                maximumFractionDigits: 2,
              })}
              % of profit
            </strong>
          </span>
        </div>

        <div className="mt-6 grid gap-4">
          {currencySummaries.map((summary) => (
            <dl
              key={summary.currency}
              className="grid gap-3 border-t border-white/9 pt-5 text-sm sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-black text-white/38 uppercase">
                  {summary.currency} accounting
                </dt>
              </div>
              <div>
                <dt className="text-white/45">Total earnings</dt>
                <dd className="mt-1 text-lg font-black text-signal">
                  {summary.commissionEarned}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Pending commission</dt>
                <dd className="mt-1 text-lg font-black text-white">
                  {summary.pendingCommission}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Available balance</dt>
                <dd className="mt-1 text-lg font-black text-emerald-300">
                  {summary.availableBalance}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Total paid</dt>
                <dd className="mt-1 text-lg font-black text-white">
                  {summary.totalPaid}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Total referral revenue</dt>
                <dd className="mt-1 text-lg font-black text-white">
                  {summary.referredRevenue}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Recoverable balance</dt>
                <dd className="mt-1 text-lg font-black text-rose-300">
                  {summary.recoverableBalance}
                </dd>
              </div>
            </dl>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Referral link copied to clipboard." : ""}
        </p>
      </div>
    </section>
  );
}
