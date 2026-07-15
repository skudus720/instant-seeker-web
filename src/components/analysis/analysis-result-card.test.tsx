import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import type { AnalysisResult } from "@/lib/types";

const result: AnalysisResult = {
  id: "demo-result",
  label: "Demonstration analysis",
  provider: "deterministic-demo",
  summary: {
    riskPosture: "balanced",
    overallSignal: "Format preview only",
    decisionNote: "Use this as a report-format preview.",
  },
  detectedMatches: [
    {
      id: "fixture",
      fixture: "Visible fixture placeholder",
      visibleMarket: "Not extracted",
      predictedCategory: "Illustrative range",
      estimatedProbability: 0.514,
      confidence: "low",
      risk: "high",
      source: "demo",
      explanation: "Demonstration only.",
    },
  ],
  extractedVisibleText: ["No OCR performed."],
  parsingWarnings: ["No model configured."],
  screenshotQuality: "limited",
  createdAt: "2026-07-10T12:00:00.000Z",
  disclaimer: "Estimates are not guarantees.",
};

describe("analysis result rendering", () => {
  it("labels demonstration output and avoids false precision", () => {
    render(<AnalysisResultCard result={result} />);
    expect(
      screen.getAllByText("Demonstration analysis")[0],
    ).toBeInTheDocument();
    expect(screen.getByText("~50%")).toBeInTheDocument();
    expect(screen.getByText("high risk")).toBeInTheDocument();
    expect(screen.getByText("balanced")).toBeInTheDocument();
    expect(screen.getByText("Demo sample")).toBeInTheDocument();
    expect(
      screen.getByText("Estimates are not guarantees."),
    ).toBeInTheDocument();
  });
});
