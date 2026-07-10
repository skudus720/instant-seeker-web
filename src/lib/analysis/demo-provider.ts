import "server-only";

import { createHash } from "node:crypto";
import type { AnalysisProvider } from "@/lib/analysis/provider";
import { analysisResultSchema } from "@/lib/analysis/schema";
import type { AnalysisRequest, AnalysisResult } from "@/lib/types";

export class DemoAnalysisProvider implements AnalysisProvider {
  readonly name = "deterministic-demo";

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const digest = createHash("sha256")
      .update(`${request.authenticatedUserId}:${request.secureImageReference}`)
      .digest("hex");
    const probability =
      0.46 + (Number.parseInt(digest.slice(0, 2), 16) % 9) / 100;

    return analysisResultSchema.parse({
      id: `demo-${digest.slice(0, 12)}`,
      label: "Demonstration analysis",
      provider: this.name,
      detectedMatches: [
        {
          id: `visible-fixture-${digest.slice(0, 6)}`,
          fixture: "Visible fixture placeholder",
          visibleMarket: "Screenshot text was not extracted",
          predictedCategory: "Illustrative probability range",
          estimatedProbability: probability,
          confidence: "low",
          risk: "high",
          explanation:
            "This deterministic sample confirms the report format only. Connect an approved image-analysis provider for real screenshot extraction.",
        },
      ],
      extractedVisibleText: [
        "No OCR was performed because no analysis provider is configured.",
      ],
      parsingWarnings: [
        "Demonstration mode does not read teams, odds, fixtures, or outcomes from the uploaded image.",
      ],
      screenshotQuality: "limited",
      createdAt: new Date().toISOString(),
      disclaimer:
        "Demonstration output only. Instant Seeker provides estimates, not guarantees. You are responsible for your decisions.",
    });
  }
}
