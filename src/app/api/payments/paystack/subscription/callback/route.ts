import { NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";
import { activateAiSubscription } from "@/lib/payments/service";
import { parseVerifiedSubscriptionPayment } from "@/lib/payments/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference =
    url.searchParams.get("reference") || url.searchParams.get("trxref");
  if (!reference) {
    return NextResponse.redirect(new URL("/plans?payment=failed", url.origin));
  }

  try {
    const transaction = await verifyPaystackTransaction(reference);
    const payment = parseVerifiedSubscriptionPayment(transaction, reference);
    if (!payment) throw new Error("Payment details did not match a plan.");
    await activateAiSubscription(payment);
    return NextResponse.redirect(new URL("/plans?payment=success", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/plans?payment=failed", url.origin));
  }
}
