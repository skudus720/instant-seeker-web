import { NextResponse } from "next/server";
import { hasValidPaystackSignature } from "@/lib/payments/paystack";
import {
  activateAiSubscription,
  activatePaidAccess,
} from "@/lib/payments/service";
import {
  parseAcceptedDispute,
  parseProcessedRefund,
  parseVerifiedSignupPayment,
  parseVerifiedSubscriptionPayment,
} from "@/lib/payments/verification";
import {
  recordReferralCommission,
  recordReferralReversal,
} from "@/lib/referrals/service";
import { webhookEventFingerprint } from "@/lib/referrals/cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (
    !hasValidPaystackSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
    )
  ) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
  if (!event || typeof event !== "object") {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const typedEvent = event as { event?: unknown; data?: unknown };
  if (typedEvent.event === "charge.success") {
    const signupPayment = parseVerifiedSignupPayment(typedEvent.data);
    const subscriptionPayment = parseVerifiedSubscriptionPayment(
      typedEvent.data,
    );
    if (!signupPayment && !subscriptionPayment) {
      return NextResponse.json({ received: false }, { status: 400 });
    }
    try {
      if (signupPayment) {
        await activatePaidAccess(signupPayment);
        await recordReferralCommission({
          paymentType: "signup",
          reference: signupPayment.reference,
          providerEventId: `charge.success:${signupPayment.providerTransactionId || webhookEventFingerprint(rawBody)}`,
          providerTransactionId: signupPayment.providerTransactionId,
        });
      }
      if (subscriptionPayment) {
        await activateAiSubscription(subscriptionPayment);
        await recordReferralCommission({
          paymentType: "subscription",
          reference: subscriptionPayment.reference,
          providerEventId: `charge.success:${subscriptionPayment.providerTransactionId || webhookEventFingerprint(rawBody)}`,
          providerTransactionId: subscriptionPayment.providerTransactionId,
        });
      }
    } catch {
      return NextResponse.json({ received: false }, { status: 500 });
    }
  } else if (typedEvent.event === "refund.processed") {
    const refund = parseProcessedRefund(typedEvent.data);
    if (!refund) {
      return NextResponse.json({ received: false }, { status: 400 });
    }
    try {
      await recordReferralReversal({
        paymentReference: refund.paymentReference,
        refundAmountMinor: refund.amountMinor,
        currency: refund.currency,
        providerEventId: `refund.processed:${refund.providerRecordId || webhookEventFingerprint(rawBody)}`,
        entryType: "refund_reversal",
      });
    } catch {
      return NextResponse.json({ received: false }, { status: 500 });
    }
  } else if (typedEvent.event === "charge.dispute.resolve") {
    const dispute = parseAcceptedDispute(typedEvent.data);
    if (dispute) {
      try {
        await recordReferralReversal({
          paymentReference: dispute.paymentReference,
          refundAmountMinor: dispute.amountMinor,
          currency: dispute.currency,
          providerEventId: `charge.dispute.resolve:${dispute.providerRecordId || webhookEventFingerprint(rawBody)}`,
          entryType: "chargeback_reversal",
        });
      } catch {
        return NextResponse.json({ received: false }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
