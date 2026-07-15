import "server-only";

import { createHash } from "node:crypto";
import type { AnalysisProvider } from "@/lib/analysis/provider";
import { analysisResultSchema } from "@/lib/analysis/schema";
import type {
  AnalysisRequest,
  AnalysisResult,
  RiskPreference,
} from "@/lib/types";

const riskPreferenceCopy: Record<
  RiskPreference,
  { label: string; probabilityOffset: number; note: string }
> = {
  conservative: {
    label: "Conservative illustrative lean",
    probabilityOffset: -0.02,
    note: "Conservative posture favors lower-variance wording and keeps confidence low when automated extraction is unavailable.",
  },
  balanced: {
    label: "Balanced illustrative lean",
    probabilityOffset: 0,
    note: "Balanced posture keeps the sample centered and avoids strong claims without model-extracted evidence.",
  },
  opportunistic: {
    label: "Higher-variance illustrative lean",
    probabilityOffset: 0.02,
    note: "Opportunistic posture can surface higher-variance possibilities, but this demo still treats them as uncertain.",
  },
};

const SAMPLE_TEAM_SELECTION_FIXTURES = [
  "Accra FC vs Kumasi United",
  "Cape Coast Stars vs Tamale City",
  "Tema Harbor vs Ho Rangers",
  "Sunyani Lions vs Obuasi Miners",
] as const;

function splitVisibleFixtureNotes(notes?: string) {
  return (notes || "")
    .split(/\n|;|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 3)
    .slice(0, 4);
}

function splitFixtureTeams(fixture: string) {
  const parts = fixture
    .split(/\s+vs\.?\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 2) return parts as [string, string];
  return null;
}

function pickDemoSelectedTeam(fixture: string, seed: number) {
  const teams = splitFixtureTeams(fixture);
  if (!teams) return undefined;
  // Occasionally abstain so demo mirrors “may skip unsupported fixtures.”
  if (seed % 7 === 0) return undefined;
  return teams[seed % 2];
}

export class DemoAnalysisProvider implements AnalysisProvider {
  readonly name = "deterministic-demo";

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const riskPreference = request.settings?.riskPreference || "balanced";
    const preference = riskPreferenceCopy[riskPreference];
    const teamSelections =
      request.settings?.responseMode === "team-selections";
    const visibleFixtureNotes = splitVisibleFixtureNotes(
      request.settings?.visibleFixtureNotes,
    );
    const digest = createHash("sha256")
      .update(request.image.bytes)
      .update(
        `${request.authenticatedUserId}:${request.image.mimeType}:${riskPreference}:${teamSelections ? "team-selections" : "full"}:${visibleFixtureNotes.join("|")}`,
      )
      .digest("hex");
    const fixtureRows = visibleFixtureNotes.length
      ? visibleFixtureNotes
      : teamSelections
        ? [...SAMPLE_TEAM_SELECTION_FIXTURES]
        : ["Visible fixture placeholder"];

    return analysisResultSchema.parse({
      id: `demo-${digest.slice(0, 12)}`,
      label: "Demonstration analysis",
      provider: this.name,
      summary: {
        riskPosture: riskPreference,
        overallSignal: visibleFixtureNotes.length
          ? "User-noted fixtures shown in demo format"
          : teamSelections
            ? "Illustrative match-to-win selections"
            : "Format preview only",
        decisionNote:
          "Use this as a report-format preview until an approved vision provider is connected.",
      },
      detectedMatches: fixtureRows.map((fixture, index) => {
        const seed = Number.parseInt(
          digest.slice(index * 2, index * 2 + 2),
          16,
        );
        const probability =
          0.46 + (seed % 9) / 100 + preference.probabilityOffset;
        const selectedTeam = teamSelections
          ? pickDemoSelectedTeam(fixture, seed)
          : undefined;
        return {
          id: `visible-fixture-${digest.slice(index * 4, index * 4 + 6)}`,
          fixture,
          visibleMarket: visibleFixtureNotes.length
            ? "User-provided visible fixture note"
            : teamSelections
              ? "Illustrative match result market"
              : "Screenshot text was not extracted",
          ...(selectedTeam ? { selectedTeam } : {}),
          predictedCategory: preference.label,
          estimatedProbability: Math.min(0.58, Math.max(0.4, probability)),
          confidence: "low",
          risk: "high",
          source: visibleFixtureNotes.length ? "user-provided" : "demo",
          explanation:
            "This deterministic sample confirms the report format only. It does not identify certain outcomes or read private betting-platform data.",
        };
      }),
      extractedVisibleText: [
        visibleFixtureNotes.length
          ? "Visible fixture notes were typed by the user, not extracted by a model."
          : "No OCR was performed because no analysis provider is configured.",
      ],
      parsingWarnings: [
        "Demonstration mode does not read teams, odds, fixtures, or outcomes from the uploaded image.",
        preference.note,
      ],
      screenshotQuality: "limited",
      createdAt: new Date().toISOString(),
      disclaimer:
        "Demonstration output only. Instant Seeker provides estimates, not guarantees. You are responsible for your decisions.",
    });
  }
}
