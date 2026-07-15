import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteHttpAnalysisProvider } from "@/lib/analysis/remote-http-provider";
import type { AnalysisRequest, DetectedMatch } from "@/lib/types";

const request: AnalysisRequest = {
  authenticatedUserId: "user-1",
  image: {
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: "image/png",
  },
  settings: {
    riskPreference: "balanced",
    responseMode: "team-selections",
  },
};

function match(
  id: string,
  fixture: string,
  selectedTeam?: string,
): DetectedMatch {
  return {
    id,
    fixture,
    visibleMarket: "Match result",
    selectedTeam,
    predictedCategory: "Provider selection",
    estimatedProbability: 0.56,
    confidence: "medium",
    risk: "high",
    source: "model-extracted",
    explanation: "A probability-based provider selection.",
  };
}

function providerResponse(detectedMatches: DetectedMatch[]) {
  return new Response(
    JSON.stringify({
      id: "analysis-1",
      label: "Model analysis",
      provider: "test-provider",
      detectedMatches,
      extractedVisibleText: [],
      parsingWarnings: [],
      screenshotQuality: "acceptable",
      createdAt: "2026-07-11T12:00:00.000Z",
      disclaimer: "Probability estimates are uncertain and not guaranteed.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("RemoteHttpAnalysisProvider team selections", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets the provider select a supported subset of visible fixtures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        providerResponse([
          match("1", "Accra FC vs Kumasi FC", "Accra FC"),
          match("2", "Tamale FC vs Cape Coast FC"),
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new RemoteHttpAnalysisProvider(
      "http://localhost:8787/analyze",
      "test-key",
    );
    const result = await provider.analyze(request);

    expect(result.detectedMatches[0].selectedTeam).toBe("Accra FC");
    expect(result.detectedMatches[1].selectedTeam).toBeUndefined();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      teamSelectionPolicy: {
        mode: string;
        mayAbstain: boolean;
        constraints: string[];
      };
    };
    expect(body.teamSelectionPolicy.mode).toBe("provider-supported-subset");
    expect(body.teamSelectionPolicy.mayAbstain).toBe(true);
    expect(body.teamSelectionPolicy.constraints.join(" ")).toMatch(
      /visibly present/i,
    );
  });

  it("rejects a selected team that is absent from its visible fixture", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          providerResponse([
            match("1", "Accra FC vs Kumasi FC", "Invented United"),
          ]),
        ),
    );

    const provider = new RemoteHttpAnalysisProvider(
      "http://localhost:8787/analyze",
      "test-key",
    );

    await expect(provider.analyze(request)).rejects.toThrow(
      /not present in its visible fixture/i,
    );
  });
});
