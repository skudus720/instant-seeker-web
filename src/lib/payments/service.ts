import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  initializeSignupCheckout,
  initializeSubscriptionCheckout,
} from "@/lib/payments/paystack";
import type {
  SignupCheckout,
  SubscriptionCheckout,
  VerifiedSignupPayment,
  VerifiedSubscriptionPayment,
} from "@/lib/payments/types";
import type { SubscriptionPlan } from "@/lib/subscriptions/plans";
import { appConfig } from "@/lib/config";
import { getReferralCheckoutSnapshot } from "@/lib/referrals/service";

export async function createAndRecordSignupCheckout({
  userId,
  email,
  origin,
}: {
  userId: string;
  email: string;
  origin: string;
}): Promise<SignupCheckout> {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Payment persistence is not configured.");

  const referral = await getReferralCheckoutSnapshot(userId);
  const checkout = await initializeSignupCheckout({ userId, email, origin });
  const { error } = await admin.from("signup_payments").insert({
    user_id: userId,
    provider: "paystack",
    provider_reference: checkout.reference,
    amount_minor: appConfig.signupFeeAmountMinor,
    currency: appConfig.signupFeeCurrency,
    status: "pending",
    net_profit_minor: appConfig.signupFeeAmountMinor,
    ...(referral
      ? {
          referral_attribution_id: referral.attributionId,
          referral_profile_id: referral.referralProfileId,
          referring_sub_admin_id: referral.subAdminId,
          referral_code_snapshot: referral.referralCode,
          sub_admin_rate_basis_points: referral.subAdminRateBasisPoints,
          super_admin_rate_basis_points: referral.superAdminRateBasisPoints,
        }
      : {}),
  });
  if (error) throw new Error("Payment session could not be recorded.");
  return checkout;
}

export async function activatePaidAccess(payment: VerifiedSignupPayment) {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Payment persistence is not configured.");
  const { error } = await admin.rpc("record_successful_signup_payment", {
    p_user_id: payment.userId,
    p_reference: payment.reference,
    p_amount_minor: payment.amountMinor,
    p_currency: payment.currency,
    p_paid_at: payment.paidAt,
  });
  if (error) throw new Error("Paid access could not be activated.");
}

export async function createAndRecordSubscriptionCheckout({
  userId,
  email,
  origin,
  plan,
}: {
  userId: string;
  email: string;
  origin: string;
  plan: SubscriptionPlan;
}): Promise<SubscriptionCheckout> {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Payment persistence is not configured.");

  const referral = await getReferralCheckoutSnapshot(userId);
  const checkout = await initializeSubscriptionCheckout({
    userId,
    email,
    origin,
    plan,
  });
  const { error } = await admin.from("ai_subscriptions").insert({
    user_id: userId,
    plan_code: plan.code,
    provider: "paystack",
    provider_reference: checkout.reference,
    amount_minor: plan.amountMinor,
    currency: plan.currency,
    status: "pending",
    net_profit_minor: plan.amountMinor,
    ...(referral
      ? {
          referral_attribution_id: referral.attributionId,
          referral_profile_id: referral.referralProfileId,
          referring_sub_admin_id: referral.subAdminId,
          referral_code_snapshot: referral.referralCode,
          sub_admin_rate_basis_points: referral.subAdminRateBasisPoints,
          super_admin_rate_basis_points: referral.superAdminRateBasisPoints,
        }
      : {}),
  });
  if (error) throw new Error("Plan payment session could not be recorded.");
  return checkout;
}

export async function activateAiSubscription(
  payment: VerifiedSubscriptionPayment,
) {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Payment persistence is not configured.");
  const { error } = await admin.rpc("record_successful_ai_subscription", {
    p_user_id: payment.userId,
    p_plan_code: payment.planCode,
    p_reference: payment.reference,
    p_amount_minor: payment.amountMinor,
    p_currency: payment.currency,
    p_paid_at: payment.paidAt,
  });
  if (error) throw new Error("AI access could not be activated.");
}
