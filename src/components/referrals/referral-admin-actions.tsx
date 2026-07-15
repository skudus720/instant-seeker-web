"use client";

import {
  AlertTriangle,
  Banknote,
  RefreshCw,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  adjustReferralCommissionAction,
  cancelReferralPayoutAction,
  manageReferralProfileAction,
  recordReferralPayoutAction,
} from "@/actions/referrals";
import { formatMinorCurrency } from "@/lib/referrals/money";
import { cn } from "@/lib/utils";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-interactive min-h-10 rounded-full bg-ink px-4 text-sm font-black text-white hover:bg-graphite disabled:cursor-wait disabled:opacity-55"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function DialogHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-black/52">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="admin-interactive grid size-9 shrink-0 place-items-center rounded-full hover:bg-black/5"
        aria-label="Close dialog"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ReferralProfileAction({
  referralProfileId,
  operation,
  enabled,
  returnTo,
}: {
  referralProfileId: string;
  operation: "enable" | "disable" | "regenerate_code";
  enabled: boolean;
  returnTo: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const content = {
    enable: {
      label: "Enable referrals",
      title: "Enable referral link",
      description: "New valid clicks can create first-touch attribution again.",
      tone: "success",
    },
    disable: {
      label: "Disable referrals",
      title: "Disable referral link",
      description:
        "New attribution and qualifying commission stop immediately. History is preserved.",
      tone: "danger",
    },
    regenerate_code: {
      label: "Regenerate code",
      title: "Regenerate referral code",
      description:
        "The current URL stops accepting new referrals. Historical transactions remain attached.",
      tone: "danger",
    },
  }[operation];
  if (
    (operation === "enable" && enabled) ||
    (operation === "disable" && !enabled)
  ) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "admin-interactive inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-black",
          content.tone === "danger"
            ? "border-alert/25 bg-alert/5 text-alert hover:bg-alert/10"
            : "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
        )}
      >
        {operation === "regenerate_code" ? (
          <RefreshCw className="size-4" />
        ) : (
          <Settings2 className="size-4" />
        )}
        {content.label}
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-black/12 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
      >
        <form action={manageReferralProfileAction}>
          <input
            type="hidden"
            name="referralProfileId"
            value={referralProfileId}
          />
          <input type="hidden" name="operation" value={operation} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <DialogHeader
            title={content.title}
            description={content.description}
            onClose={() => dialogRef.current?.close()}
          />
          <div className="p-5">
            <label
              htmlFor={`${operation}-reason`}
              className="text-xs font-black"
            >
              Required reason
            </label>
            <textarea
              id={`${operation}-reason`}
              name="reason"
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
            />
            <p className="mt-2 flex items-center gap-2 text-xs text-black/42">
              <AlertTriangle className="size-3.5" aria-hidden="true" /> This
              action is written to immutable audit history.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-10 rounded-full border border-black/12 px-4 text-sm font-bold"
            >
              Cancel
            </button>
            <SubmitButton label="Confirm action" />
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ReferralPayoutDialog({
  referralProfileId,
  availableByCurrency,
  returnTo,
}: {
  referralProfileId: string;
  availableByCurrency: Record<string, string>;
  returnTo: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currencies = Object.entries(availableByCurrency);
  const canPay = currencies.some(([, amount]) => BigInt(amount) > BigInt(0));
  const utcDefault = new Date().toISOString().slice(0, 16);
  return (
    <>
      <button
        type="button"
        disabled={!canPay}
        onClick={() => dialogRef.current?.showModal()}
        className="admin-interactive inline-flex min-h-10 items-center gap-2 rounded-full bg-signal px-4 text-sm font-black text-ink hover:bg-[#ffd64f] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Banknote className="size-4" aria-hidden="true" /> Record payout
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog m-auto w-[min(36rem,calc(100%-2rem))] rounded-lg border border-black/12 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
      >
        <form action={recordReferralPayoutAction}>
          <input
            type="hidden"
            name="referralProfileId"
            value={referralProfileId}
          />
          <input type="hidden" name="returnTo" value={returnTo} />
          <DialogHeader
            title="Record an external payout"
            description="Use this only after money has been sent outside Instant Seeker. The ledger will allocate oldest available earnings first."
            onClose={() => dialogRef.current?.close()}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="text-xs font-black">
              Currency
              <select
                name="currency"
                required
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 bg-white px-3 text-sm"
              >
                {currencies.map(([currency, amount]) => (
                  <option
                    key={currency}
                    value={currency}
                    disabled={BigInt(amount) <= BigInt(0)}
                  >
                    {currency} · {formatMinorCurrency(amount, currency)}{" "}
                    available
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-black">
              Payout amount
              <input
                name="amount"
                inputMode="decimal"
                required
                placeholder="0.00"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-black">
              Payment method
              <input
                name="paymentMethod"
                required
                maxLength={80}
                placeholder="Mobile Money"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-black">
              External reference
              <input
                name="externalReference"
                required
                maxLength={160}
                autoComplete="off"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-black sm:col-span-2">
              Payout date and time (UTC)
              <input
                type="datetime-local"
                name="payoutDate"
                defaultValue={utcDefault}
                required
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-black sm:col-span-2">
              Notes
              <textarea
                name="notes"
                maxLength={2000}
                rows={3}
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
              />
            </label>
            <label className="text-xs font-black sm:col-span-2">
              Required payout reason
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-10 rounded-full border border-black/12 px-4 text-sm font-bold"
            >
              Cancel
            </button>
            <SubmitButton label="Record paid payout" />
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ReferralAdjustmentDialog({
  referralProfileId,
  currencies,
  returnTo,
}: {
  referralProfileId: string;
  currencies: string[];
  returnTo: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="admin-interactive inline-flex min-h-10 items-center gap-2 rounded-full border border-black/12 bg-white px-4 text-sm font-black hover:bg-black/5"
      >
        <Settings2 className="size-4" /> Adjustment
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-black/12 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
      >
        <form action={adjustReferralCommissionAction}>
          <input
            type="hidden"
            name="referralProfileId"
            value={referralProfileId}
          />
          <input type="hidden" name="returnTo" value={returnTo} />
          <DialogHeader
            title="Create ledger adjustment"
            description="Adjustments never rewrite a payment or payout. A separate signed ledger entry and audit record are created."
            onClose={() => dialogRef.current?.close()}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="text-xs font-black">
              Currency
              <select
                name="currency"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 bg-white px-3 text-sm"
              >
                {currencies.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-black">
              Signed amount
              <input
                name="amount"
                required
                inputMode="decimal"
                placeholder="-10.00 or 10.00"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-black sm:col-span-2">
              Required reason
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-10 rounded-full border border-black/12 px-4 text-sm font-bold"
            >
              Cancel
            </button>
            <SubmitButton label="Record adjustment" />
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ReferralPayoutCancelAction({
  payoutId,
  returnTo,
}: {
  payoutId: string;
  returnTo: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="admin-interactive inline-flex min-h-8 items-center gap-1.5 rounded-full border border-alert/20 px-2.5 text-[11px] font-black text-alert hover:bg-alert/5"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" /> Cancel record
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-black/12 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
      >
        <form action={cancelReferralPayoutAction}>
          <input type="hidden" name="payoutId" value={payoutId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <DialogHeader
            title="Cancel payout record"
            description="Use this only to correct an incorrectly recorded external payout. The record and allocations stay in history while its paid allocation is released."
            onClose={() => dialogRef.current?.close()}
          />
          <div className="p-5">
            <label className="text-xs font-black">
              Required cancellation reason
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-10 rounded-full border border-black/12 px-4 text-sm font-bold"
            >
              Keep payout
            </button>
            <SubmitButton label="Cancel payout record" />
          </div>
        </form>
      </dialog>
    </>
  );
}
