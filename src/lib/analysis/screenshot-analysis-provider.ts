import "server-only";

import { createHash } from "node:crypto";
import type { AnalysisProvider } from "@/lib/analysis/provider";
import { DemoAnalysisProvider } from "@/lib/analysis/demo-provider";
import { withTimeout } from "@/lib/analysis/ocr-timeout";
import { analysisResultSchema } from "@/lib/analysis/schema";
import { extractVisibleTextFromImage } from "@/lib/analysis/screenshot-ocr";
import { parseSportyBetVirtualsText } from "@/lib/analysis/sportybet-virtuals-parser";
import type { AnalysisRequest, AnalysisResult } from "@/lib/types";

const SERVER_OCR_TIMEOUT_MS = 12_000;

export class ScreenshotAnalysisProvider implements AnalysisProvider {
  readonly name = "screenshot-ocr";
  private readonly fallback = new DemoAnalysisProvider();

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const teamSelections =
      request.settings?.responseMode === "team-selections";
    const notes = request.settings?.visibleFixtureNotes?.trim() || "";
    const clientText = request.settings?.extractedVisibleText?.trim() || "";

    let ocrText = clientText;
    let ocrError: string | null = null;

    // Prefer browser OCR. Only attempt serverless OCR when the client
    // could not extract text, and never let it hang the request.
    if (!ocrText) {
      try {
        ocrText = await withTimeout(
          extractVisibleTextFromImage(
            request.image.bytes,
            request.image.mimeType,
          ),
          SERVER_OCR_TIMEOUT_MS,
          "Screenshot OCR timed out on the server.",
        );
      } catch (error) {
        ocrError =
          error instanceof Error ? error.message : "OCR failed unexpectedly.";
      }
    }

    const combinedText = [ocrText, notes].filter(Boolean).join("\n");
    const parsed = parseSportyBetVirtualsText(combinedText);

    if (!parsed.length) {
      const demo = await this.fallback.analyze(request);
      return analysisResultSchema.parse({
        ...demo,
        parsingWarnings: [
          ...(ocrError
            ? [`Screenshot OCR failed: ${ocrError}`]
            : [
                "Could not read enough Instant Virtuals fixtures from the screenshot.",
              ]),
          "Fell back to demonstration selections. Retake a clearer crop of the match list.",
          ...demo.parsingWarnings,
        ],
      });
    }

    const digest = createHash("sha256")
      .update(request.image.bytes)
      .update(combinedText)
      .digest("hex");

    return analysisResultSchema.parse({
      id: `ocr-${digest.slice(0, 12)}`,
      label: "Model analysis",
      provider: this.name,
      summary: {
        riskPosture: request.settings?.riskPreference || "balanced",
        overallSignal: teamSelections
          ? `Selected ${parsed.length} Instant Virtuals match${parsed.length === 1 ? "" : "es"} to win from the screenshot`
          : `Extracted ${parsed.length} Instant Virtuals fixtures from the screenshot`,
        decisionNote:
          "Picks favor the lower-priced 1/2 outcome visible in each fixture row. Treat them as uncertain estimates.",
      },
      detectedMatches: parsed.map((match, index) => ({
        id: `virtuals-${digest.slice(index * 3, index * 3 + 8)}`,
        fixture: match.fixture,
        visibleMarket: `1X2 · ${match.homeOdds.toFixed(2)} / ${match.drawOdds.toFixed(2)} / ${match.awayOdds.toFixed(2)}`,
        ...(teamSelections ? { selectedTeam: match.selectedTeam } : {}),
        predictedCategory: "Favorite win lean from visible odds",
        estimatedProbability: match.estimatedProbability,
        confidence:
          Math.abs(match.homeOdds - match.awayOdds) >= 0.45 ? "medium" : "low",
        risk:
          Math.min(match.homeOdds, match.awayOdds) <= 1.85 ? "medium" : "high",
        source: "model-extracted" as const,
        explanation:
          "Selected from visible Instant Virtuals team codes and decimal odds in the uploaded screenshot. This is an estimate, not a guarantee.",
      })),
      extractedVisibleText: combinedText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 40),
      parsingWarnings: [
        ...(clientText
          ? []
          : ["Browser OCR text was empty; used a timed server OCR pass."]),
        ...(ocrError ? [`OCR warning: ${ocrError}`] : []),
        "Selections use visible 1/2 favorites only; draw markets are not chosen as win picks.",
      ],
      screenshotQuality:
        parsed.length >= 4 ? "good" : parsed.length >= 2 ? "acceptable" : "limited",
      createdAt: new Date().toISOString(),
      disclaimer:
        "Instant Seeker provides estimated picks from visible screenshot text. These are probability-style leans, not guarantees. You are responsible for your decisions.",
    });
  }
}
