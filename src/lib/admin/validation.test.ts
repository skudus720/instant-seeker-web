import { describe, expect, it } from "vitest";
import {
  adminMutationSchema,
  aiConfigDraftSchema,
  contentDraftSchema,
  createSubAdminSchema,
} from "@/lib/admin/validation";

describe("admin mutation validation", () => {
  it("requires a meaningful reason for sensitive actions", () => {
    const result = adminMutationSchema.safeParse({
      kind: "user_suspend",
      targetId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      reason: "no",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid sub-admin creation payload", () => {
    const result = createSubAdminSchema.safeParse({
      displayName: "Ama Partner",
      email: "partner@example.com",
      momoNumber: "0241234567",
      password: "Partner123",
      ageConfirmed: "on",
      authorizationConfirmed: "on",
      reason: "Onboard referral partner for Accra",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.momoNumber).toBe("+233241234567");
    }
  });

  it("rejects an invalid momo number for sub-admin creation", () => {
    expect(
      createSubAdminSchema.safeParse({
        displayName: "Ama Partner",
        email: "partner@example.com",
        momoNumber: "0301234567",
        password: "Partner123",
        ageConfirmed: "on",
        authorizationConfirmed: "on",
        reason: "Onboard referral partner for Accra",
      }).success,
    ).toBe(false);
  });

  it("requires age and account-creation attestations", () => {
    expect(
      createSubAdminSchema.safeParse({
        displayName: "Ama Partner",
        email: "PARTNER@EXAMPLE.COM",
        momoNumber: "0241234567",
        password: "Partner123",
        reason: "Onboard referral partner for Accra",
      }).success,
    ).toBe(false);
  });

  it("allows short or low-strength temporary passwords for sub-admin creation", () => {
    const result = createSubAdminSchema.safeParse({
      displayName: "Ama Partner",
      email: "partner@example.com",
      momoNumber: "0241234567",
      password: "a",
      ageConfirmed: "on",
      authorizationConfirmed: "on",
      reason: "Onboard referral partner for Accra",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid CMS JSON on the server schema", () => {
    expect(
      contentDraftSchema.safeParse({
        contentKey: "homepage.hero",
        content: "not-json",
        reason: "Update approved content",
      }).success,
    ).toBe(false);
  });

  it("rejects unsafe AI configuration limits", () => {
    expect(
      aiConfigDraftSchema.safeParse({
        providerName: "provider",
        modelIdentifier: "model-v1",
        promptTemplateVersion: "v1",
        extractionInstructions: "Extract only visible fixture information.",
        analysisInstructions: "Return probability framing and risk warnings.",
        confidenceThresholds: '{"low":0.45,"medium":0.6,"high":0.75}',
        riskThresholds: '{"low":0.7,"medium":0.55,"high":0}',
        maximumScreenshotBytes: 99_000_000,
        acceptedMimeTypes: ["image/png"],
        maximumMatches: 20,
        analysisTimeoutMs: 45_000,
        retryLimit: 2,
        perUserDailyLimit: 20,
        featureFlags: "{}",
        configurationNotes: "Initial controlled configuration",
        reason: "Create reviewed configuration",
      }).success,
    ).toBe(false);
  });

  it("accepts a bounded, versioned AI configuration without secret fields", () => {
    const result = aiConfigDraftSchema.safeParse({
      providerName: "remote-http",
      modelIdentifier: "vision-model-v2",
      promptTemplateVersion: "2026-07-11",
      extractionInstructions:
        "Extract only text and fixtures visible in the screenshot.",
      analysisInstructions:
        "Return uncertain probability estimates, confidence, risk, and explanations.",
      confidenceThresholds: '{"low":0.45,"medium":0.6,"high":0.75}',
      riskThresholds: '{"low":0.7,"medium":0.55,"high":0}',
      maximumScreenshotBytes: 10 * 1024 * 1024,
      acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maximumMatches: 20,
      analysisTimeoutMs: 45_000,
      retryLimit: 2,
      perUserDailyLimit: 20,
      featureFlags: '{"qualityReview":true}',
      configurationNotes: "Reviewed production candidate",
      reason: "Create a reviewed configuration candidate",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("apiKey");
      expect(result.data.confidenceThresholds.high).toBe(0.75);
    }
  });
});
