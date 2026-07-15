import { describe, expect, it } from "vitest";
import { appConfig } from "@/lib/config";
import {
  allowedDetectedMimeTypes,
  validateAnalysisSettings,
  validateUploadMetadata,
} from "@/lib/validation/upload";

describe("screenshot upload validation", () => {
  it("accepts supported images under 10 MB", () => {
    expect(
      validateUploadMetadata({
        name: "matches.webp",
        size: 500_000,
        type: "image/webp",
      }).success,
    ).toBe(true);
  });

  it("rejects oversized files and renamed non-images", () => {
    expect(
      validateUploadMetadata({
        name: "large.png",
        size: appConfig.maxUploadBytes + 1,
        type: "image/png",
      }).success,
    ).toBe(false);
    expect(
      validateUploadMetadata({
        name: "fake.png",
        size: 5_000,
        type: "application/pdf",
      }).success,
    ).toBe(false);
    expect(allowedDetectedMimeTypes.has("application/pdf")).toBe(false);
  });

  it("accepts valid analysis settings and normalizes visible fixture notes", () => {
    const result = validateAnalysisSettings({
      riskPreference: "conservative",
      responseMode: "team-selections",
      visibleFixtureNotes: "  Team A vs Team B  \n\n  Team C vs Team D  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.riskPreference).toBe("conservative");
      expect(result.data.responseMode).toBe("team-selections");
      expect(result.data.visibleFixtureNotes).toBe(
        "Team A vs Team B\nTeam C vs Team D",
      );
    }
  });

  it("rejects unsupported analysis settings", () => {
    expect(
      validateAnalysisSettings({
        riskPreference: "unsupported",
      }).success,
    ).toBe(false);
    expect(
      validateAnalysisSettings({
        responseMode: "winner-guarantees",
      }).success,
    ).toBe(false);
    expect(
      validateAnalysisSettings({
        riskPreference: "balanced",
        visibleFixtureNotes: "x".repeat(1_201),
      }).success,
    ).toBe(false);
  });
});
