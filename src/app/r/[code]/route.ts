import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureReferralVisit } from "@/lib/referrals/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDestination(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/signup";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const url = new URL(request.url);
  const destination = safeDestination(url.searchParams.get("next"));
  const { code } = await params;

  try {
    if (await checkRateLimit("referral-capture", 60, 60_000)) {
      await captureReferralVisit({
        code,
        landingPage: destination,
      });
    }
  } catch {
    // Attribution failure must not block access to the public application.
  }

  return NextResponse.redirect(new URL(destination, url.origin), 303);
}
