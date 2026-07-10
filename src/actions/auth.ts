"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode, siteUrl } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeRedirect } from "@/lib/utils";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";

export interface AuthActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
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
        "Demo mode: your details were validated but no account was stored.",
      redirectTo: "/dashboard",
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
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: {
        display_name: parsed.data.displayName,
        age_confirmed: true,
        terms_accepted: true,
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message:
        "We could not create the account. Check your details or try again shortly.",
    };
  }

  return {
    ok: true,
    message: "Check your email to confirm your account, then sign in.",
  };
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

  if (isDemoMode) {
    return {
      ok: true,
      message: "Demo mode: sign-in details were validated but not stored.",
      redirectTo,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Sign-in is temporarily unavailable." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return {
      ok: false,
      message: "We could not sign you in with those details.",
    };
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
