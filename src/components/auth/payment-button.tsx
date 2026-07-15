"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { beginSignupPaymentAction } from "@/actions/payment";
import type { PaymentActionResult } from "@/lib/payments/types";

export function PaymentButton({ feeLabel }: { feeLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PaymentActionResult | null>(null);

  async function beginCheckout() {
    setPending(true);
    const response = await beginSignupPaymentAction();
    setResult(response);
    if (response.checkoutUrl) {
      window.location.assign(response.checkoutUrl);
      return;
    }
    if (response.redirectTo) {
      router.push(response.redirectTo);
      router.refresh();
      return;
    }
    setPending(false);
  }

  return (
    <div className="grid gap-4">
      {result && !result.ok ? (
        <p
          role="alert"
          className="rounded-md border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          {result.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={beginCheckout}
        disabled={pending}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-signal px-5 py-3 font-black text-ink transition-transform hover:-translate-y-0.5 hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-0 disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {pending ? "Opening checkout…" : `Pay securely · ${feeLabel}`}
        {!pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}
