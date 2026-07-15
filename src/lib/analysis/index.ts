import "server-only";

import type { AnalysisProvider } from "@/lib/analysis/provider";
import { DemoAnalysisProvider } from "@/lib/analysis/demo-provider";
import { RemoteHttpAnalysisProvider } from "@/lib/analysis/remote-http-provider";
import { analysisProviderConfig } from "@/lib/config";

export function getAnalysisProvider(): AnalysisProvider {
  if (
    analysisProviderConfig.provider === "remote-http" &&
    analysisProviderConfig.endpoint &&
    analysisProviderConfig.apiKey
  ) {
    return new RemoteHttpAnalysisProvider(
      analysisProviderConfig.endpoint,
      analysisProviderConfig.apiKey,
    );
  }

  return new DemoAnalysisProvider();
}

export type { AnalysisProvider } from "@/lib/analysis/provider";
