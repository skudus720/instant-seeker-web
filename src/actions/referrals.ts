"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  referralAdjustmentSchema,
  referralPayoutCancellationSchema,
  referralPayoutSchema,
  referralProfileActionSchema,
} from "@/lib/referrals/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function resultUrl(
  returnTo: string,
  kind: "success" | "error",
  message: string,
) {
  const url = new URL(returnTo, "http://instant-seeker.local");
  url.searchParams.set("admin_result", kind);
  url.searchParams.set("admin_message", message.slice(0, 180));
  return `${url.pathname}${url.search}`;
}

async function requestMetadata() {
  const requestHeaders = await headers();
  return {
    ip_address:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      undefined,
    user_agent: requestHeaders.get("user-agent")?.slice(0, 500) || undefined,
    request_id: requestHeaders.get("x-request-id")?.slice(0, 120) || undefined,
  };
}

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown failure";
  const allowed = [
    "reason",
    "available balance",
    "positive payout",
    "duplicate",
    "reference",
    "active sub-admin",
    "referral profile not found",
    "authorization",
  ];
  return allowed.some((part) => message.toLowerCase().includes(part))
    ? message.slice(0, 180)
    : "The referral accounting change could not be completed.";
}

export async function manageReferralProfileAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = referralProfileActionSchema.safeParse(raw);
  const fallback = "/admin/referrals";
  const returnTo =
    typeof raw.returnTo === "string" &&
    raw.returnTo.startsWith("/admin/referrals")
      ? raw.returnTo
      : fallback;
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid referral action.",
      ),
    );
  }
  const actor = await requirePermission("referrals:manage");
  if (actor.demo) {
    redirect(
      resultUrl(returnTo, "error", "Mutations are disabled in demo preview."),
    );
  }
  if (
    !(await checkRateLimit(
      `admin-referral-profile:${actor.id}`,
      20,
      10 * 60_000,
    ))
  ) {
    redirect(resultUrl(returnTo, "error", "Please wait before trying again."));
  }
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_manage_referral_profile", {
    p_referral_profile_id: parsed.data.referralProfileId,
    p_operation: parsed.data.operation,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error) redirect(resultUrl(returnTo, "error", publicError(error)));
  revalidatePath("/admin/referrals", "layout");
  redirect(
    resultUrl(returnTo, "success", "Referral profile updated and audited."),
  );
}

export async function recordReferralPayoutAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = referralPayoutSchema.safeParse(raw);
  const returnTo =
    typeof raw.returnTo === "string" &&
    raw.returnTo.startsWith("/admin/referrals")
      ? raw.returnTo
      : "/admin/referrals";
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid payout details.",
      ),
    );
  }
  const actor = await requirePermission("referrals:finance");
  if (actor.demo) {
    redirect(
      resultUrl(returnTo, "error", "Payouts are disabled in demo preview."),
    );
  }
  if (
    !(await checkRateLimit(
      `admin-referral-payout:${actor.id}`,
      10,
      10 * 60_000,
    ))
  ) {
    redirect(resultUrl(returnTo, "error", "Please wait before trying again."));
  }
  const supabase = await createServerSupabaseClient();
  const payoutTimestamp = `${parsed.data.payoutDate}:00.000Z`;
  const { error } = (await supabase?.rpc("admin_record_referral_payout", {
    p_referral_profile_id: parsed.data.referralProfileId,
    p_currency: parsed.data.currency,
    p_amount_minor: parsed.data.amount,
    p_payment_method: parsed.data.paymentMethod,
    p_external_reference: parsed.data.externalReference,
    p_notes: parsed.data.notes,
    p_payout_date: payoutTimestamp,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error) redirect(resultUrl(returnTo, "error", publicError(error)));
  revalidatePath("/admin/referrals", "layout");
  revalidatePath("/referrals");
  redirect(
    resultUrl(returnTo, "success", "Payout recorded, allocated, and audited."),
  );
}

export async function adjustReferralCommissionAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = referralAdjustmentSchema.safeParse(raw);
  const returnTo =
    typeof raw.returnTo === "string" &&
    raw.returnTo.startsWith("/admin/referrals")
      ? raw.returnTo
      : "/admin/referrals";
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid adjustment.",
      ),
    );
  }
  const actor = await requirePermission("referrals:finance");
  if (actor.demo) {
    redirect(
      resultUrl(returnTo, "error", "Adjustments are disabled in demo preview."),
    );
  }
  if (
    !(await checkRateLimit(
      `admin-referral-adjustment:${actor.id}`,
      10,
      10 * 60_000,
    ))
  ) {
    redirect(resultUrl(returnTo, "error", "Please wait before trying again."));
  }
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_adjust_referral_commission", {
    p_referral_profile_id: parsed.data.referralProfileId,
    p_currency: parsed.data.currency,
    p_sub_admin_amount_minor: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error) redirect(resultUrl(returnTo, "error", publicError(error)));
  revalidatePath("/admin/referrals", "layout");
  revalidatePath("/referrals");
  redirect(
    resultUrl(
      returnTo,
      "success",
      "Commission adjustment recorded and audited.",
    ),
  );
}

export async function cancelReferralPayoutAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = referralPayoutCancellationSchema.safeParse(raw);
  const returnTo =
    typeof raw.returnTo === "string" &&
    raw.returnTo.startsWith("/admin/referrals")
      ? raw.returnTo
      : "/admin/referrals";
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid payout cancellation.",
      ),
    );
  }
  const actor = await requirePermission("referrals:finance");
  if (actor.demo) {
    redirect(
      resultUrl(returnTo, "error", "Payouts are disabled in demo preview."),
    );
  }
  if (
    !(await checkRateLimit(
      `admin-referral-payout-cancel:${actor.id}`,
      10,
      10 * 60_000,
    ))
  ) {
    redirect(resultUrl(returnTo, "error", "Please wait before trying again."));
  }
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_cancel_referral_payout", {
    p_payout_id: parsed.data.payoutId,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error) redirect(resultUrl(returnTo, "error", publicError(error)));
  revalidatePath("/admin/referrals", "layout");
  revalidatePath("/referrals");
  redirect(
    resultUrl(
      returnTo,
      "success",
      "Payout cancellation recorded and allocations released.",
    ),
  );
}
