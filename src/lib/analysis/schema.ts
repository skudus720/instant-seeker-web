import { z } from "zod";

export const analysisResultSchema = z.object({
  id: z.string(),
  label: z.enum(["Demonstration analysis", "Model analysis"]),
  provider: z.string(),
  detectedMatches: z.array(
    z.object({
      id: z.string(),
      fixture: z.string(),
      visibleMarket: z.string(),
      predictedCategory: z.string(),
      estimatedProbability: z.number().min(0).max(1),
      confidence: z.enum(["low", "medium", "high"]),
      risk: z.enum(["low", "medium", "high"]),
      explanation: z.string(),
    }),
  ),
  extractedVisibleText: z.array(z.string()),
  parsingWarnings: z.array(z.string()),
  screenshotQuality: z.enum(["limited", "acceptable", "good"]),
  createdAt: z.string().datetime(),
  disclaimer: z.string(),
});
