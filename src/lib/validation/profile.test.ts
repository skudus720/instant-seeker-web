import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/validation/profile";

describe("profile validation", () => {
  it("accepts valid member details in common Ghana number formats", () => {
    expect(
      profileSchema.safeParse({
        displayName: "Ama Mensah",
        momoNumber: "024 123 4567",
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        displayName: "Kofi A.",
        momoNumber: "+233 50 123 4567",
      }).success,
    ).toBe(true);
  });

  it("rejects short names and invalid Mobile Money numbers", () => {
    const result = profileSchema.safeParse({
      displayName: "A",
      momoNumber: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.displayName).toBeTruthy();
      expect(result.error.flatten().fieldErrors.momoNumber).toBeTruthy();
    }
  });
});
