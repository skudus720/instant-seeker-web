import "server-only";

import type { AnalysisProvider } from "@/lib/analysis/provider";
import { analysisResultSchema } from "@/lib/analysis/schema";
import type {
  AnalysisRequest,
  AnalysisResult,
  DetectedMatch,
} from "@/lib/types";

function requireTrustedEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error("Analysis provider endpoint must use HTTPS.");
  }
  return url.toString();
}

function normalizeVisibleName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function selectionIsGroundedInFixture(match: DetectedMatch) {
  if (!match.selectedTeam) return true;
  const fixture = normalizeVisibleName(match.fixture);
  const selectedTeam = normalizeVisibleName(match.selectedTeam);
  return Boolean(selectedTeam && ` ${fixture} `.includes(` ${selectedTeam} `));
}

export class RemoteHttpAnalysisProvider implements AnalysisProvider {
  readonly name = "remote-http";
  private readonly endpoint: string;

  constructor(
    endpoint: string,
    private readonly apiKey: string,
  ) {
    this.endpoint = requireTrustedEndpoint(endpoint);
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const timeoutMs = Math.min(
      180_000,
      Math.max(1_000, request.settings?.configuration?.timeoutMs || 45_000),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authenticatedUserId: request.authenticatedUserId,
          image: {
            mimeType: request.image.mimeType,
            dataBase64: Buffer.from(request.image.bytes).toString("base64"),
          },
          imageRetention: "none",
          settings: request.settings,
          teamSelectionPolicy:
            request.settings?.responseMode === "team-selections"
              ? {
                  mode: "provider-supported-subset",
                  mayAbstain: true,
                  output:
                    "Set selectedTeam only on the detected fixtures you choose. Omit it on skipped fixtures.",
                  constraints: [
                    "Select only team names visibly present in the corresponding fixture.",
                    "Skip fixtures that are unclear or unsupported by the visible screenshot.",
                    "Do not invent teams, fixtures, probabilities, or guaranteed outcomes.",
                  ],
                }
              : undefined,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error("Analysis provider request failed.");
    }

    const payload = (await response.json()) as unknown;
    const candidate =
      typeof payload === "object" && payload !== null && "result" in payload
        ? (payload as { result: unknown }).result
        : payload;

    const result = analysisResultSchema.parse(candidate);
    if (
      request.settings?.responseMode === "team-selections" &&
      result.label === "Model analysis" &&
      result.detectedMatches.some(
        (match) => match.selectedTeam && !selectionIsGroundedInFixture(match),
      )
    ) {
      throw new Error(
        "Analysis provider selected a team that was not present in its visible fixture.",
      );
    }
    return result;
  }
}
