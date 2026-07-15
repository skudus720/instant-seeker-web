import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamSelectionResult } from "@/components/referrals/team-selection-result";
import type { AnalysisResult } from "@/lib/types";

const modelResult: AnalysisResult = {
  id: "model-result",
  label: "Model analysis",
  provider: "test-provider",
  detectedMatches: [
    {
      id: "fixture-1",
      fixture: "Accra FC vs Kumasi FC",
      visibleMarket: "Match result",
      selectedTeam: "Accra FC",
      predictedCategory: "Home result",
      estimatedProbability: 0.58,
      confidence: "medium",
      risk: "high",
      explanation: "This detail should not appear in the compact view.",
    },
  ],
  extractedVisibleText: [],
  parsingWarnings: [],
  screenshotQuality: "acceptable",
  createdAt: "2026-07-11T12:00:00.000Z",
  disclaimer: "Probability estimates are uncertain and not guaranteed.",
};

describe("team selection result", () => {
  it("shows AI-chosen match winners without analytical explanations", () => {
    render(<TeamSelectionResult result={modelResult} />);

    expect(
      screen.getByRole("heading", { name: "Matches to win" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("AI-chosen teams from the analyzed screenshot."),
    ).toBeInTheDocument();
    expect(screen.getByText("Accra FC")).toBeInTheDocument();
    expect(
      screen.queryByText(modelResult.detectedMatches[0].explanation),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("58%")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/outcomes are uncertain/i),
    ).not.toBeInTheDocument();
  });

  it("shows demonstration selections when demo output includes selected teams", () => {
    render(
      <TeamSelectionResult
        result={{
          ...modelResult,
          label: "Demonstration analysis",
          detectedMatches: [
            {
              ...modelResult.detectedMatches[0],
              selectedTeam: "Accra FC",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText("Demonstration selections — format preview only."),
    ).toBeInTheDocument();
    expect(screen.getByText("Accra FC")).toBeInTheDocument();
  });

  it("explains empty demonstration output without fabricating teams", () => {
    render(
      <TeamSelectionResult
        result={{
          ...modelResult,
          label: "Demonstration analysis",
          detectedMatches: [
            {
              ...modelResult.detectedMatches[0],
              selectedTeam: undefined,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText(
        "No demonstration selections were generated for this preview.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Accra FC")).not.toBeInTheDocument();
  });
});
