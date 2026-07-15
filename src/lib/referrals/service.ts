import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { isDemoMode, referralConfig } from "@/lib/config";
import {
  createVisitorToken,
  hashVisitorToken,
  signReferralCookie,
  verifyReferralCookie,
} from "@/lib/referrals/cookie";
import type { ReferralCheckoutSnapshot } from "@/lib/referrals/types";
import { referralCodeSchema } from "@/lib/referrals/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const captureResultSchema = z.object({
  id: z.string().uuid(),
  referralProfileId: z.string().uuid(),
  subAdminId: z.string().uuid(),
  referralCode: z.string(),
  commissionRateBasisPoints: z.coerce.number().int().min(0).max(10_000),
  expiresAt: z.string(),
});

interface AttributionRow {
  id: string;
  referral_profile_id: string;
  sub_admin_id: string;
  referral_code_snapshot: string;
  commission_rate_basis_points: number;
  expires_at: string;
  user_id: string | null;
  visitor_token_hash: string;
}

async function authenticatedUserId() {
  const supabase = await createServerSupabaseClient();
  const { data } = (await supabase?.auth.getUser()) || { data: { user: null } };
  return data.user?.id || null;
}

export async function captureReferralVisit({
  code,
  landingPage,
}: {
  code: string;
  landingPage: string;
}) {
  const parsedCode = referralCodeSchema.safeParse(code);
  const secret = referralConfig.attributionSecret;
  const admin = createAdminSupabaseClient();
  if (isDemoMode || !parsedCode.success || !secret || !admin) return false;

  const cookieStore = await cookies();
  const now = Date.now();
  const existing = verifyReferralCookie(
    cookieStore.get(referralConfig.cookieName)?.value,
    secret,
    now,
  );
  const visitorToken = existing?.visitorToken || createVisitorToken();
  const expiresAtSeconds =
    existing?.expiresAt ||
    Math.floor(now / 1000) + referralConfig.attributionDays * 86_400;
  const expiresAt = new Date(expiresAtSeconds * 1000).toISOString();
  const { data, error } = await admin.rpc("capture_referral_attribution", {
    p_referral_code: parsedCode.data,
    p_visitor_token_hash: hashVisitorToken(visitorToken),
    p_landing_page: landingPage.slice(0, 500),
    p_user_id: await authenticatedUserId(),
    p_expires_at: expiresAt,
  });
  if (error) throw new Error("Referral attribution could not be recorded.");
  const result = captureResultSchema.safeParse(data);
  if (!result.success) return false;

  cookieStore.set(
    referralConfig.cookieName,
    signReferralCookie(
      {
        attributionId: result.data.id,
        visitorToken,
        expiresAt: expiresAtSeconds,
      },
      secret,
    ),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, expiresAtSeconds - Math.floor(now / 1000)),
    },
  );
  return true;
}

async function eligibleSnapshot(
  attribution: AttributionRow,
  customerId: string,
): Promise<ReferralCheckoutSnapshot | null> {
  if (attribution.sub_admin_id === customerId) return null;
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const [{ data: referral }, { data: owner }] = await Promise.all([
    admin
      .from("sub_admin_referral_profiles")
      .select("id, user_id, referral_enabled, commission_rate_basis_points")
      .eq("id", attribution.referral_profile_id)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("id, role, account_status, suspended_until, deleted_at")
      .eq("id", attribution.sub_admin_id)
      .maybeSingle(),
  ]);

  const suspensionElapsed =
    owner?.account_status === "suspended" &&
    typeof owner.suspended_until === "string" &&
    new Date(owner.suspended_until).getTime() <= Date.now();
  const accountOperational =
    owner?.account_status === "active" || suspensionElapsed;

  if (
    !referral ||
    !owner ||
    referral.user_id !== attribution.sub_admin_id ||
    referral.referral_enabled !== true ||
    owner.role !== "sub_admin" ||
    !accountOperational ||
    owner.deleted_at
  ) {
    return null;
  }

  const rate = Number(attribution.commission_rate_basis_points);
  if (!Number.isInteger(rate) || rate < 0 || rate > 10_000) return null;
  return {
    attributionId: attribution.id,
    referralProfileId: attribution.referral_profile_id,
    subAdminId: attribution.sub_admin_id,
    referralCode: attribution.referral_code_snapshot,
    subAdminRateBasisPoints: rate,
    superAdminRateBasisPoints: 10_000 - rate,
  };
}

export async function getReferralCheckoutSnapshot(
  customerId: string,
): Promise<ReferralCheckoutSnapshot | null> {
  const admin = createAdminSupabaseClient();
  if (!admin || isDemoMode) return null;

  const { data: permanent } = await admin
    .from("referral_attributions")
    .select(
      "id, referral_profile_id, sub_admin_id, referral_code_snapshot, commission_rate_basis_points, expires_at, user_id, visitor_token_hash",
    )
    .eq("user_id", customerId)
    .maybeSingle();

  // A permanent first-touch record blocks reassignment even if it is no longer eligible.
  if (permanent) {
    return eligibleSnapshot(permanent as AttributionRow, customerId);
  }

  const secret = referralConfig.attributionSecret;
  if (!secret) return null;
  const cookieStore = await cookies();
  const cookie = verifyReferralCookie(
    cookieStore.get(referralConfig.cookieName)?.value,
    secret,
  );
  if (!cookie) return null;

  const { error } = await admin.rpc("claim_referral_attribution", {
    p_attribution_id: cookie.attributionId,
    p_visitor_token_hash: hashVisitorToken(cookie.visitorToken),
    p_user_id: customerId,
  });
  if (error) return null;

  const { data: claimed } = await admin
    .from("referral_attributions")
    .select(
      "id, referral_profile_id, sub_admin_id, referral_code_snapshot, commission_rate_basis_points, expires_at, user_id, visitor_token_hash",
    )
    .eq("user_id", customerId)
    .maybeSingle();
  return claimed
    ? eligibleSnapshot(claimed as AttributionRow, customerId)
    : null;
}

export async function recordReferralCommission({
  paymentType,
  reference,
  providerEventId,
  providerTransactionId,
}: {
  paymentType: "signup" | "subscription";
  reference: string;
  providerEventId: string;
  providerTransactionId?: string;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Referral accounting is not configured.");
  const { error } = await admin.rpc("record_referral_commission_for_payment", {
    p_payment_type: paymentType,
    p_reference: reference,
    p_provider_event_id: providerEventId,
    p_provider_transaction_id: providerTransactionId || null,
    p_hold_days: referralConfig.commissionHoldDays,
  });
  if (error) throw new Error("Referral commission could not be recorded.");
}

export async function recordReferralReversal({
  paymentReference,
  refundAmountMinor,
  currency,
  providerEventId,
  entryType,
}: {
  paymentReference: string;
  refundAmountMinor: number;
  currency: string;
  providerEventId: string;
  entryType: "refund_reversal" | "chargeback_reversal";
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Referral accounting is not configured.");
  const { error } = await admin.rpc("record_referral_commission_reversal", {
    p_payment_reference: paymentReference,
    p_refund_amount_minor: String(refundAmountMinor),
    p_currency: currency,
    p_provider_event_id: providerEventId,
    p_entry_type: entryType,
  });
  if (error) throw new Error("Referral reversal could not be recorded.");
}
