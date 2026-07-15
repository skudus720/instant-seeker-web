import { z } from "zod";

export const analysisResultSchema = z
  .object({
    id: z.string(),
    label: z.enum(["Demonstration analysis", "Model analysis"]),
    provider: z.string(),
    summary: z
      .object({
        riskPosture: z.enum(["conservative", "balanced", "opportunistic"]),
        overallSignal: z.string(),
        decisionNote: z.string(),
      })
      .optional(),
    detectedMatches: z.array(
      z.object({
        id: z.string(),
        fixture: z.string(),
        visibleMarket: z.string(),
        selectedTeam: z.string().trim().min(1).max(160).optional(),
        predictedCategory: z.string(),
        estimatedProbability: z.number().min(0).max(1),
        confidence: z.enum(["low", "medium", "high"]),
        risk: z.enum(["low", "medium", "high"]),
        source: z.enum(["model-extracted", "user-provided", "demo"]).optional(),
        explanation: z.string(),
      }),
    ),
    extractedVisibleText: z.array(z.string()),
    parsingWarnings: z.array(z.string()),
    screenshotQuality: z.enum(["limited", "acceptable", "good"]),
    createdAt: z.string().datetime(),
    disclaimer: z.string().min(20),
  })
  .superRefine((result, context) => {
    const userFacingText = [
      result.summary?.overallSignal,
      result.summary?.decisionNote,
      result.disclaimer,
      ...result.detectedMatches.flatMap((match) => [
        match.selectedTeam,
        match.predictedCategory,
        match.explanation,
      ]),
    ]
      .filter(Boolean)
      .join(" ");
    if (
      /\b(hack|crack|bypass|guarantees? (?:a )?win|will (?:certainly|definitely) win|risk[- ]free betting|fixed winner)\b/i.test(
        userFacingText,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Analysis output contains prohibited certainty or access claims.",
      });
    }
    if (
      !/probab|estimate|uncertain|not (?:a )?guarantee/i.test(result.disclaimer)
    ) {
      context.addIssue({
        code: "custom",
        path: ["disclaimer"],
        message:
          "Disclaimer must clearly frame the result as uncertain or estimated.",
      });
    }
  });
