import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

describe("authentication validation", () => {
  it("accepts a complete adult signup", () => {
    const result = signupSchema.safeParse({
      displayName: "Ama K.",
      email: "ama@example.com",
      password: "StrongPass9",
      confirmPassword: "StrongPass9",
      ageConfirmed: true,
      termsAccepted: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords and missing confirmations", () => {
    const result = signupSchema.safeParse({
      displayName: "A",
      email: "not-an-email",
      password: "weak",
      confirmPassword: "different",
      ageConfirmed: false,
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.ageConfirmed).toBeDefined();
      expect(fields.termsAccepted).toBeDefined();
    }

    const mismatch = signupSchema.safeParse({
      displayName: "Valid Name",
      email: "valid@example.com",
      password: "StrongPass9",
      confirmPassword: "Different9",
      ageConfirmed: true,
      termsAccepted: true,
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
      email: "unknown@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
