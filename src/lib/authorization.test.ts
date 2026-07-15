import { describe, expect, it } from "vitest";
import { canAccessPrivateRecord, canModerate } from "@/lib/authorization";

describe("private data authorization", () => {
  it("allows owners and administrators but denies other users", () => {
    expect(canAccessPrivateRecord({ id: "owner", role: "user" }, "owner")).toBe(
      true,
    );
    expect(canAccessPrivateRecord({ id: "other", role: "user" }, "owner")).toBe(
      false,
    );
    expect(
      canAccessPrivateRecord({ id: "admin", role: "admin" }, "owner"),
    ).toBe(true);
    expect(
      canAccessPrivateRecord(
        { id: "super-admin", role: "super_admin" },
        "owner",
      ),
    ).toBe(true);
    expect(canAccessPrivateRecord(null, "owner")).toBe(false);
  });

  it("reserves moderation for administrators", () => {
    expect(canModerate({ role: "user" })).toBe(false);
    expect(canModerate({ role: "admin" })).toBe(true);
    expect(canModerate({ role: "super_admin" })).toBe(true);
  });
});
