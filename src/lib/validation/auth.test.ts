import { describe, expect, it } from "vitest";
import {
  loginSchema,
  normalizeGhanaMomoNumber,
  signupSchema,
} from "@/lib/validation/auth";

describe("authentication validation", () => {
  it("accepts a complete adult signup", () => {
    const result = signupSchema.safeParse({
      displayName: "Ama K.",
      email: "ama@example.com",
      momoNumber: "024 123 4567",
      password: "StrongPass9",
      confirmPassword: "StrongPass9",
      ageConfirmed: true,
      termsAccepted: true,
      feeAccepted: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords and missing confirmations", () => {
    const result = signupSchema.safeParse({
      displayName: "A",
      email: "not-an-email",
      momoNumber: "12345",
      password: "weak",
      confirmPassword: "different",
      ageConfirmed: false,
      termsAccepted: false,
      feeAccepted: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.ageConfirmed).toBeDefined();
      expect(fields.termsAccepted).toBeDefined();
      expect(fields.feeAccepted).toBeDefined();
      expect(fields.momoNumber).toBeDefined();
    }

    const mismatch = signupSchema.safeParse({
      displayName: "Valid Name",
      email: "valid@example.com",
      momoNumber: "+233541234567",
      password: "StrongPass9",
      confirmPassword: "Different9",
      ageConfirmed: true,
      termsAccepted: true,
      feeAccepted: true,
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match.",
      );
    }
  });

  it("requires both login fields without revealing account existence", () => {
    const result = loginSchema.safeParse({
      identifier: "unknown@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a username for the development sub-admin login", () => {
    const result = loginSchema.safeParse({
      identifier: "subadmin",
      password: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes supported Ghana Mobile Money number formats", () => {
    expect(normalizeGhanaMomoNumber("024 123 4567")).toBe("+233241234567");
    expect(normalizeGhanaMomoNumber("233541234567")).toBe("+233541234567");
    expect(normalizeGhanaMomoNumber("+233 55 123 4567")).toBe("+233551234567");
  });
});
