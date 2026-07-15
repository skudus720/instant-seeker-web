"use server";

import { headers } from "next/headers";
import { appConfig, isPaymentConfigured, siteUrl } from "@/lib/config";
import { isStaffRole } from "@/lib/admin/permissions";
import { getCurrentUser } from "@/lib/auth";
import {
  createAndRecordSignupCheckout,
  createAndRecordSubscriptionCheckout,
} from "@/lib/payments/service";
import type { PaymentActionResult } from "@/lib/payments/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSubscriptionPlan, planCodeSchema } from "@/lib/subscriptions/plans";

export async function beginSignupPaymentAction(): Promise<PaymentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      message: "Log in before continuing to payment.",
      redirectTo: "/login?next=/payment-required",
    };
  }
  if (user.demo) {
    return {
      ok: false,
      message: "Demo mode does not collect payments.",
    };
  }
  if (user.accessStatus === "active" || isStaffRole(user.role)) {
    return {
      ok: true,
      message: "Access is already active.",
      redirectTo: "/dashboard",
    };
  }
  if (!(await checkRateLimit("signup-payment", 6, 10 * 60_000))) {
    return {
      ok: false,
      message: "Too many checkout attempts. Please wait and try again.",
    };
  }
  if (!isPaymentConfigured) {
    return {
      ok: false,
      message: `Secure checkout for the ${appConfig.signupFeeCurrency} ${appConfig.signupFeeAmount.toFixed(2)} fee is temporarily unavailable. No charge was made.`,
    };
  }

  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin") || siteUrl;
    const checkout = await createAndRecordSignupCheckout({
      userId: user.id,
      email: user.email,
      origin,
    });
    return {
      ok: true,
      message: "Secure checkout is ready.",
      checkoutUrl: checkout.authorizationUrl,
    };
  } catch {
    return {
      ok: false,
      message: "Secure checkout could not be started. No charge was made.",
    };
  }
}

export async function beginSubscriptionPaymentAction(
  input: unknown,
): Promise<PaymentActionResult> {
  const parsedPlanCode = planCodeSchema.safeParse(input);
  const plan = parsedPlanCode.success
    ? getSubscriptionPlan(parsedPlanCode.data)
    : null;
  if (!plan) {
    return { ok: false, message: "Choose a valid AI access plan." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      message: "Log in before choosing a plan.",
      redirectTo: "/login?next=/plans",
    };
  }
  if (user.demo) {
    return {
      ok: false,
      message: "Demo mode previews plans but does not collect payments.",
    };
  }
  if (!isStaffRole(user.role) && user.accessStatus !== "active") {
    return {
      ok: false,
      message: "Complete the GHS 50 account payment before choosing a plan.",
      redirectTo: "/payment-required",
    };
  }
  if (!(await checkRateLimit("subscription-payment", 6, 10 * 60_000))) {
    return {
      ok: false,
      message: "Too many checkout attempts. Please wait and try again.",
    };
  }
  if (!isPaymentConfigured) {
    return {
      ok: false,
      message:
        "Secure plan checkout is temporarily unavailable. No charge was made.",
    };
  }

  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin") || siteUrl;
    const checkout = await createAndRecordSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      origin,
      plan,
    });
    return {
      ok: true,
      message: "Secure checkout is ready.",
      checkoutUrl: checkout.authorizationUrl,
    };
  } catch {
    return {
      ok: false,
      message: "Secure plan checkout could not be started. No charge was made.",
    };
  }
}
