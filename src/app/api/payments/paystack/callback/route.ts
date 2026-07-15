import { NextResponse } from "next/server";
import { activatePaidAccess } from "@/lib/payments/service";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";
import { parseVerifiedSignupPayment } from "@/lib/payments/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference =
    url.searchParams.get("reference") || url.searchParams.get("trxref");
  if (!reference) {
    return NextResponse.redirect(new URL("/login?payment=failed", url.origin));
  }

  try {
    const transaction = await verifyPaystackTransaction(reference);
    const payment = parseVerifiedSignupPayment(transaction, reference);
    if (!payment) throw new Error("Payment details did not match signup.");
    await activatePaidAccess(payment);
    return NextResponse.redirect(
      new URL("/login?payment=success&next=/plans", url.origin),
    );
  } catch {
    return NextResponse.redirect(new URL("/login?payment=failed", url.origin));
  }
}
