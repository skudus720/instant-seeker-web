import { describe, expect, it } from "vitest";
import { DemoAnalysisProvider } from "@/lib/analysis/demo-provider";
import type { AnalysisRequest } from "@/lib/types";

const baseRequest: AnalysisRequest = {
  authenticatedUserId: "demo-user",
  image: {
    bytes: new Uint8Array([9, 8, 7, 6, 5]),
    mimeType: "image/png",
  },
  settings: {
    riskPreference: "balanced",
  },
};

describe("DemoAnalysisProvider team selections", () => {
  it("returns illustrative selectedTeam picks in team-selections mode", async () => {
    const provider = new DemoAnalysisProvider();
    const result = await provider.analyze({
      ...baseRequest,
      settings: {
        ...baseRequest.settings,
        responseMode: "team-selections",
      },
    });

    expect(result.label).toBe("Demonstration analysis");
    expect(result.detectedMatches.length).toBeGreaterThan(1);
    expect(
      result.detectedMatches.every((match) => /\bvs\b/i.test(match.fixture)),
    ).toBe(true);

    const selections = result.detectedMatches.filter(
      (match) => match.selectedTeam,
    );
    expect(selections.length).toBeGreaterThan(0);
    for (const match of selections) {
      expect(match.fixture).toContain(match.selectedTeam!);
    }
  });

  it("does not invent selectedTeam in full response mode", async () => {
    const provider = new DemoAnalysisProvider();
    const result = await provider.analyze(baseRequest);

    expect(result.detectedMatches).toHaveLength(1);
    expect(result.detectedMatches[0].selectedTeam).toBeUndefined();
  });
});
