"use client";

import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { beginSubscriptionPaymentAction } from "@/actions/payment";
import type { PaymentActionResult } from "@/lib/payments/types";
import type { PlanCode } from "@/lib/subscriptions/plans";

export function PlanCheckoutButton({
  planCode,
  planName,
  demoMode,
  extending,
}: {
  planCode: PlanCode;
  planName: string;
  demoMode: boolean;
  extending: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PaymentActionResult | null>(null);

  async function beginCheckout() {
    setPending(true);
    setResult(null);
    const response = await beginSubscriptionPaymentAction(planCode);
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
    <div className="mt-auto pt-8">
      {result && !result.ok ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-rose-300/25 bg-rose-300/[0.08] px-3 py-2 text-xs leading-5 text-rose-200"
        >
          {result.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={beginCheckout}
        disabled={pending || demoMode}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-signal px-6 py-3 font-black text-ink shadow-[0_14px_34px_rgba(255,202,39,0.14)] transition-transform hover:-translate-y-0.5 hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Sparkles className="size-4" aria-hidden="true" />
        )}
        {demoMode
          ? "Checkout disabled in demo"
          : pending
            ? "Opening secure checkout…"
            : `${extending ? "Extend with" : "Choose"} ${planName}`}
        {!pending && !demoMode ? (
          <ArrowRight className="size-4" aria-hidden="true" />
        ) : null}
      </button>
    </div>
  );
}
