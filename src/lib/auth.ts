import "server-only";

import { forbidden, redirect } from "next/navigation";
import {
  hasPermission,
  isAccountOperational,
  isSubAdminRole,
  isStaffRole,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { isDemoMode } from "@/lib/config";
import {
  hasLocalSubAdminSession,
  localSubAdminUsername,
} from "@/lib/local-sub-admin-preview";
import { planCodeSchema } from "@/lib/subscriptions/plans";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActiveAiSubscription, SessionUser } from "@/lib/types";

const demoUser: SessionUser = {
  id: "demo-user",
  email: "demo@instantseeker.local",
  displayName: "Demo member",
  role: "user",
  accessStatus: "active",
  accountStatus: "active",
  suspendedUntil: null,
  lastActiveAt: null,
  momoNumber: null,
  subscription: null,
  demo: true,
};

const demoAdminUser: SessionUser = {
  ...demoUser,
  id: "demo-admin",
  email: "admin-preview@instantseeker.local",
  displayName: "Admin preview",
  role: "super_admin",
};

function localSubAdminUser(): SessionUser {
  const username = localSubAdminUsername();
  return {
    ...demoUser,
    id: "local-sub-admin-preview",
    email: `${username.toLowerCase()}@instantseeker.local`,
    displayName: username,
    role: "sub_admin",
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (await hasLocalSubAdminSession()) return localSubAdminUser();
  if (isDemoMode) return demoUser;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  await supabase.rpc("touch_current_user_activity");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, role, access_status, momo_number, account_status, suspended_until, last_active_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  let subscription: ActiveAiSubscription | null = null;
  const { data: subscriptionRow } = await supabase
    .from("ai_subscriptions")
    .select("id, plan_code, status, starts_at, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .lte("starts_at", new Date().toISOString())
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsedPlan = planCodeSchema.safeParse(subscriptionRow?.plan_code);
  if (
    subscriptionRow &&
    parsedPlan.success &&
    subscriptionRow.status === "active" &&
    typeof subscriptionRow.starts_at === "string" &&
    typeof subscriptionRow.expires_at === "string"
  ) {
    subscription = {
      id: subscriptionRow.id,
      planCode: parsedPlan.data,
      status: "active",
      startsAt: subscriptionRow.starts_at,
      expiresAt: subscriptionRow.expires_at,
    };
  }

  return {
    id: user.id,
    email: user.email,
    displayName:
      typeof profile?.display_name === "string"
        ? profile.display_name
        : user.user_metadata.display_name || user.email.split("@")[0],
    role:
      profile?.role === "super_admin"
        ? "super_admin"
        : profile?.role === "admin"
          ? "admin"
          : profile?.role === "sub_admin"
            ? "sub_admin"
            : "user",
    accessStatus:
      profile?.access_status === "active" ||
      profile?.access_status === "refunded"
        ? profile.access_status
        : "payment_pending",
    accountStatus:
      profile?.account_status === "suspended" ||
      profile?.account_status === "deletion_pending" ||
      profile?.account_status === "anonymized" ||
      profile?.account_status === "deleted"
        ? profile.account_status
        : "active",
    suspendedUntil:
      typeof profile?.suspended_until === "string"
        ? profile.suspended_until
        : null,
    lastActiveAt:
      typeof profile?.last_active_at === "string"
        ? profile.last_active_at
        : null,
    momoNumber:
      typeof profile?.momo_number === "string" ? profile.momo_number : null,
    subscription,
    demo: false,
  };
}

export async function requireUser(returnTo = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!user.demo && !isAccountOperational(user)) forbidden();
  return user;
}

export async function requirePaidUser(returnTo = "/dashboard") {
  const user = await requireUser(returnTo);
  if (!user.demo && !isStaffRole(user.role) && user.accessStatus !== "active") {
    redirect("/payment-required");
  }
  return user;
}

export async function requireSubAdmin() {
  const user = await requireUser("/referrals");
  if (!isSubAdminRole(user.role) || !isAccountOperational(user)) forbidden();
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.demo) {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.ADMIN_DEMO_PREVIEW === "true"
    ) {
      return demoAdminUser;
    }
    forbidden();
  }
  if (!isStaffRole(user.role) || !isAccountOperational(user)) forbidden();
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  if (user.role !== "super_admin") forbidden();
  return user;
}

export async function requirePermission(permission: AdminPermission) {
  const user = await requireAdmin();
  if (!hasPermission(user, permission)) forbidden();
  return user;
}
