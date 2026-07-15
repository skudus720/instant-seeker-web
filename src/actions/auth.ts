"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  appConfig,
  isDemoMode,
  isPaymentConfigured,
  siteUrl,
} from "@/lib/config";
import { isStaffRole, isSubAdminRole } from "@/lib/admin/permissions";
import {
  authenticateLocalSubAdmin,
  clearLocalSubAdminSession,
  createLocalSubAdminSession,
  isLocalSubAdminLogin,
} from "@/lib/local-sub-admin-preview";
import { createAndRecordSignupCheckout } from "@/lib/payments/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeRedirect } from "@/lib/utils";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  normalizeGhanaMomoNumber,
} from "@/lib/validation/auth";

export interface AuthActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
  checkoutUrl?: string;
}

function invalidResult(
  errors: Record<string, string[] | undefined>,
): AuthActionResult {
  return {
    ok: false,
    message: "Please review the highlighted fields.",
    fieldErrors: Object.fromEntries(
      Object.entries(errors).filter((entry): entry is [string, string[]] =>
        Boolean(entry[1]),
      ),
    ),
  };
}

async function requestOrigin() {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") || siteUrl;
}

export async function signupAction(input: unknown): Promise<AuthActionResult> {
  if (!(await checkRateLimit("signup", 5, 10 * 60_000))) {
    return {
      ok: false,
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error.flatten().fieldErrors);

  if (isDemoMode) {
    return {
      ok: true,
      message:
        "Demo mode: your details were validated. No account was stored and no payment was collected.",
      redirectTo: "/dashboard",
    };
  }

  const admin = createAdminSupabaseClient();
  if (!isPaymentConfigured || !admin) {
    return {
      ok: false,
      message: `Secure checkout for the ${appConfig.signupFeeCurrency} ${appConfig.signupFeeAmount.toFixed(2)} access fee is temporarily unavailable. No account was created and no charge was made.`,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Account service is temporarily unavailable.",
    };
  }

  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/payment-required`,
      data: {
        display_name: parsed.data.displayName,
        momo_number: normalizeGhanaMomoNumber(parsed.data.momoNumber),
        age_confirmed: true,
        terms_accepted: true,
        fee_accepted: true,
      },
    },
  });

  if (
    error ||
    !data.user ||
    (Array.isArray(data.user.identities) && data.user.identities.length === 0)
  ) {
    return {
      ok: false,
      message:
        "We could not create the account. Check your details or try again shortly.",
    };
  }

  try {
    const checkout = await createAndRecordSignupCheckout({
      userId: data.user.id,
      email: parsed.data.email,
      origin,
    });
    return {
      ok: true,
      message: "Account details accepted. Opening secure checkout.",
      checkoutUrl: checkout.authorizationUrl,
    };
  } catch {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return {
      ok: false,
      message:
        "Secure checkout could not be started. No charge was made. Please try again.",
    };
  }
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  if (!(await checkRateLimit("login", 8, 10 * 60_000))) {
    return {
      ok: false,
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error.flatten().fieldErrors);
  const redirectTo = sanitizeRedirect(parsed.data.redirectTo);

  if (isLocalSubAdminLogin(parsed.data.identifier)) {
    if (
      !authenticateLocalSubAdmin(
        parsed.data.identifier,
        parsed.data.password,
      ) ||
      !(await createLocalSubAdminSession())
    ) {
      return {
        ok: false,
        message: "We could not sign you in with those details.",
      };
    }
    return {
      ok: true,
      message: "Signed in to the local sub-admin test account.",
      redirectTo: "/referrals",
    };
  }

  if (isDemoMode) {
    return {
      ok: true,
      message: "Demo mode: sign-in details were validated but not stored.",
      redirectTo,
    };
  }

  if (!parsed.data.identifier.includes("@")) {
    return {
      ok: false,
      message: "We could not sign you in with those details.",
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Sign-in is temporarily unavailable." };
  }

  let signInError: { message?: string } | null = null;
  try {
    const result = await supabase.auth.signInWithPassword({
      email: parsed.data.identifier,
      password: parsed.data.password,
    });
    signInError = result.error;
  } catch (reason) {
    const detail =
      reason instanceof Error ? reason.message.toLowerCase() : "fetch failed";
    if (detail.includes("fetch") || detail.includes("network")) {
      return {
        ok: false,
        message:
          "Sign-in could not reach the database service. Check Supabase URL/keys and Hostinger outbound network, then try again.",
      };
    }
    return {
      ok: false,
      message: "We could not sign you in with those details.",
    };
  }
  if (signInError) {
    const detail = signInError.message?.toLowerCase() || "";
    if (
      detail.includes("fetch") ||
      detail.includes("network") ||
      detail.includes("failed to fetch")
    ) {
      return {
        ok: false,
        message:
          "Sign-in could not reach the database service. Check Supabase URL/keys and Hostinger outbound network, then try again.",
      };
    }
    return {
      ok: false,
      message: "We could not sign you in with those details.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", user.id)
      .maybeSingle();
    const profileRole =
      profile?.role === "super_admin"
        ? "super_admin"
        : profile?.role === "admin"
          ? "admin"
          : profile?.role === "sub_admin"
            ? "sub_admin"
            : "user";
    if (isSubAdminRole(profileRole)) {
      return {
        ok: true,
        message: "Signed in securely.",
        redirectTo: "/referrals",
      };
    }
    if (
      !isStaffRole(profileRole) &&
      !isSubAdminRole(profileRole) &&
      profile?.access_status !== "active"
    ) {
      return {
        ok: true,
        message: "Sign-in successful. Complete the access payment to continue.",
        redirectTo: "/payment-required",
      };
    }
    if (
      !isStaffRole(profileRole) &&
      !isSubAdminRole(profileRole) &&
      redirectTo === "/dashboard"
    ) {
      const now = new Date().toISOString();
      const { data: subscription } = await supabase
        .from("ai_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .lte("starts_at", now)
        .gt("expires_at", now)
        .limit(1)
        .maybeSingle();
      if (!subscription) {
        return {
          ok: true,
          message: "Signed in securely. Choose an AI access plan to continue.",
          redirectTo: "/plans",
        };
      }
    }
  }

  return { ok: true, message: "Signed in securely.", redirectTo };
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<AuthActionResult> {
  if (!(await checkRateLimit("password-reset", 4, 30 * 60_000))) {
    return {
      ok: false,
      message: "Please wait before requesting another reset email.",
    };
  }

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error.flatten().fieldErrors);

  if (!isDemoMode) {
    const supabase = await createServerSupabaseClient();
    const origin = await requestOrigin();
    await supabase?.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
  }

  return {
    ok: true,
    message:
      "If an account matches that address, a password-reset email is on its way.",
  };
}

export async function signOutAction() {
  await clearLocalSubAdminSession();
  if (!isDemoMode) {
    const supabase = await createServerSupabaseClient();
    await supabase?.auth.signOut();
  }
  redirect("/");
}

export async function resetPasswordAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error.flatten().fieldErrors);
  if (isDemoMode) {
    return {
      ok: true,
      message: "Demo mode: the password was validated but not stored.",
      redirectTo: "/dashboard",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.auth.updateUser({
    password: parsed.data.password,
  })) || { error: new Error("Unavailable") };
  if (error) {
    return {
      ok: false,
      message:
        "The reset link may have expired. Request a new one and try again.",
    };
  }

  return {
    ok: true,
    message: "Your password has been updated.",
    redirectTo: "/dashboard",
  };
}
