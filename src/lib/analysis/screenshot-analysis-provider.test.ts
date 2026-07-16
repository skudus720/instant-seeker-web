import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const extractVisibleTextFromImage = vi.fn<
  (bytes: Uint8Array, mimeType: string) => Promise<string>
>(async () =>
  readFileSync(
    path.join(process.cwd(), "tmp/fixtures/ocr-output.txt"),
    "utf8",
  ),
);

vi.mock("@/lib/analysis/screenshot-ocr", () => ({
  extractVisibleTextFromImage: (
    bytes: Uint8Array,
    mimeType: string,
  ) => extractVisibleTextFromImage(bytes, mimeType),
}));

import { ScreenshotAnalysisProvider } from "@/lib/analysis/screenshot-analysis-provider";

describe("ScreenshotAnalysisProvider", () => {
  beforeEach(() => {
    extractVisibleTextFromImage.mockClear();
  });

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

  it("uses browser-extracted text and skips server OCR", async () => {
    const provider = new ScreenshotAnalysisProvider();
    const result = await provider.analyze({
      authenticatedUserId: "tester",
      image: {
        bytes: new Uint8Array([9, 8, 7, 6]),
        mimeType: "image/png",
      },
      settings: {
        riskPreference: "balanced",
        responseMode: "team-selections",
        extractedVisibleText: [
          "MCI vs WHU",
          "1.74 3.38 5.58",
          "ESP vs ALA",
          "2.70 2.92 2.97",
          "OVI vs ELC",
          "1.88 3.36 4.52",
          "BIL vs VCF",
          "3.17 2.76 2.68",
          "GET vs RMA",
          "3.75 2.57 2.54",
          "SEV vs RSO",
          "2.69 3.00 2.90",
        ].join("\n"),
      },
    });

    expect(extractVisibleTextFromImage).not.toHaveBeenCalled();
    expect(result.detectedMatches.map((match) => match.selectedTeam)).toEqual([
      "MCI",
      "ESP",
      "OVI",
      "VCF",
      "RMA",
      "SEV",
    ]);
  });
});
