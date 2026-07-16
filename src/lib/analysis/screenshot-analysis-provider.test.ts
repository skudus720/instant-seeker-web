import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analysis/screenshot-ocr", () => ({
  extractVisibleTextFromImage: vi.fn(async () =>
    readFileSync(
      path.join(process.cwd(), "tmp/fixtures/ocr-output.txt"),
      "utf8",
    ),
  ),
}));

import { ScreenshotAnalysisProvider } from "@/lib/analysis/screenshot-analysis-provider";

describe("ScreenshotAnalysisProvider", () => {
  it("returns Instant Virtuals win picks from OCR text", async () => {
    const provider = new ScreenshotAnalysisProvider();
    const result = await provider.analyze({
      authenticatedUserId: "tester",
      image: {
        bytes: new Uint8Array([1, 2, 3, 4]),
        mimeType: "image/png",
      },
      settings: {
        riskPreference: "balanced",
        responseMode: "team-selections",
      },
    });

    expect(result.label).toBe("Model analysis");
    expect(result.detectedMatches.map((match) => match.selectedTeam)).toEqual([
      "MCI",
      "ESP",
      "OVI",
      "VCF",
      "RMA",
      "SEV",
    ]);
    for (const match of result.detectedMatches) {
      expect(match.fixture).toContain(match.selectedTeam!);
      expect(match.source).toBe("model-extracted");
    }
  });
});
