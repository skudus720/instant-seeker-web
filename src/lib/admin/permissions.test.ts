import { describe, expect, it } from "vitest";
import {
  hasRoleBasedAnalysisAccess,
  hasPermission,
  isAccountOperational,
  roleHasPermission,
} from "@/lib/admin/permissions";

const activeAdmin = {
  role: "admin" as const,
  accountStatus: "active" as const,
  suspendedUntil: null,
};

describe("admin permissions", () => {
  it("denies every admin permission to regular users", () => {
    expect(roleHasPermission("user", "dashboard:view")).toBe(false);
    expect(
      hasPermission(
        { role: "user", accountStatus: "active", suspendedUntil: null },
        "users:view",
      ),
    ).toBe(false);
  });

  it("keeps sub-admin partners outside operational and super-admin permissions", () => {
    expect(roleHasPermission("sub_admin", "dashboard:view")).toBe(false);
    expect(roleHasPermission("sub_admin", "referrals:view")).toBe(false);
    expect(roleHasPermission("admin", "referrals:view")).toBe(false);
    expect(roleHasPermission("super_admin", "referrals:view")).toBe(true);
    expect(roleHasPermission("super_admin", "referrals:finance")).toBe(true);
  });

  it("gives sub-admins analysis access without granting admin permissions", () => {
    expect(hasRoleBasedAnalysisAccess("sub_admin")).toBe(true);
    expect(hasRoleBasedAnalysisAccess("admin")).toBe(true);
    expect(hasRoleBasedAnalysisAccess("super_admin")).toBe(true);
    expect(hasRoleBasedAnalysisAccess("user")).toBe(false);
    expect(roleHasPermission("sub_admin", "analyses:manage")).toBe(false);
  });

  it("allows operational admins but reserves staff roles for super admins", () => {
    expect(hasPermission(activeAdmin, "users:manage")).toBe(true);
    expect(hasPermission(activeAdmin, "users:roles")).toBe(false);
    expect(roleHasPermission("super_admin", "users:roles")).toBe(true);
    expect(roleHasPermission("super_admin", "settings:security")).toBe(true);
  });

  it("removes access from suspended administrators immediately", () => {
    expect(
      hasPermission(
        {
          ...activeAdmin,
          accountStatus: "suspended",
          suspendedUntil: "2099-01-01T00:00:00.000Z",
        },
        "dashboard:view",
        new Date("2026-07-11T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("treats an elapsed temporary suspension as operational", () => {
    expect(
      isAccountOperational(
        {
          accountStatus: "suspended",
          suspendedUntil: "2026-07-10T00:00:00.000Z",
        },
        new Date("2026-07-11T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
