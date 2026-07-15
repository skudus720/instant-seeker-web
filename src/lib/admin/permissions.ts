import type { SessionUser, UserRole } from "@/lib/types";

export type AdminPermission =
  | "dashboard:view"
  | "users:view"
  | "users:manage"
  | "users:roles"
  | "analyses:view"
  | "analyses:manage"
  | "moderation:view"
  | "moderation:manage"
  | "content:view"
  | "content:manage"
  | "ai_config:view"
  | "ai_config:manage"
  | "ai_config:activate"
  | "reports:view"
  | "reports:export"
  | "system:view"
  | "system:manage"
  | "audit:view"
  | "audit:sensitive"
  | "settings:view"
  | "settings:manage"
  | "settings:security"
  | "referrals:view"
  | "referrals:manage"
  | "referrals:finance";

const adminPermissions = new Set<AdminPermission>([
  "dashboard:view",
  "users:view",
  "users:manage",
  "analyses:view",
  "analyses:manage",
  "moderation:view",
  "moderation:manage",
  "content:view",
  "content:manage",
  "ai_config:view",
  "ai_config:manage",
  "reports:view",
  "reports:export",
  "system:view",
  "audit:view",
  "settings:view",
  "settings:manage",
]);

const superAdminOnly = new Set<AdminPermission>([
  "users:roles",
  "ai_config:activate",
  "system:manage",
  "audit:sensitive",
  "settings:security",
  "referrals:view",
  "referrals:manage",
  "referrals:finance",
]);

export function isStaffRole(role: UserRole): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}

export function isSubAdminRole(role: UserRole): role is "sub_admin" {
  return role === "sub_admin";
}

export function hasRoleBasedAnalysisAccess(role: UserRole) {
  return isStaffRole(role) || isSubAdminRole(role);
}

export function isAccountOperational(
  account: Pick<SessionUser, "accountStatus" | "suspendedUntil">,
  now = new Date(),
) {
  if (account.accountStatus === "active") return true;
  return (
    account.accountStatus === "suspended" &&
    Boolean(account.suspendedUntil) &&
    Date.parse(account.suspendedUntil || "") <= now.getTime()
  );
}

export function roleHasPermission(role: UserRole, permission: AdminPermission) {
  if (role === "super_admin") return true;
  return (
    role === "admin" &&
    adminPermissions.has(permission) &&
    !superAdminOnly.has(permission)
  );
}

export function hasPermission(
  user: Pick<SessionUser, "role" | "accountStatus" | "suspendedUntil"> | null,
  permission: AdminPermission,
  now = new Date(),
) {
  return Boolean(
    user &&
    isStaffRole(user.role) &&
    isAccountOperational(user, now) &&
    roleHasPermission(user.role, permission),
  );
}
