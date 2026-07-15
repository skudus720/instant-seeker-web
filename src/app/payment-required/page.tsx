import type { Metadata } from "next";
import { LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PaymentButton } from "@/components/auth/payment-button";
import { isStaffRole } from "@/lib/admin/permissions";
import { appConfig } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Complete account payment",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PaymentRequiredPage() {
  const user = await requireUser("/payment-required");
  if (user.demo || isStaffRole(user.role) || user.accessStatus === "active") {
    redirect("/dashboard");
  }
  const feeLabel = formatCurrency(
    appConfig.signupFeeAmount,
    appConfig.signupFeeCurrency,
  );

  return (
    <AuthShell
      mode="signup"
      title="Complete your access"
      description="Your account details are ready. Finish the one-time secure payment to activate the analysis workspace."
    >
      <div className="grid gap-5">
        <div className="flex items-center justify-between gap-4 border-y border-white/10 py-4">
          <span className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-signal text-ink">
              <ReceiptText className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-black">
                One-time account access
              </span>
              <span className="block text-xs text-white/40">
                No recurring subscription
              </span>
            </span>
          </span>
          <strong className="text-lg font-black text-signal">{feeLabel}</strong>
        </div>

        <div className="grid gap-3 text-sm leading-6 text-white/52">
          <p className="flex items-start gap-3">
            <ShieldCheck
              className="mt-1 size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            Checkout supports Mobile Money and card where available.
          </p>
          <p className="flex items-start gap-3">
            <LockKeyhole
              className="mt-1 size-4 shrink-0 text-signal"
              aria-hidden="true"
            />
            Payment details are handled by Paystack, not stored by Instant
            Seeker.
          </p>
        </div>

        <PaymentButton feeLabel={feeLabel} />
        <p className="text-center text-xs leading-5 text-white/36">
          This fee is for platform access. It is not a bet, stake, deposit, or
          promise of winnings.
        </p>
      </div>
    </AuthShell>
  );
}
