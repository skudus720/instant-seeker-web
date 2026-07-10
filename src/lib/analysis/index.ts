import "server-only";

import type { AnalysisProvider } from "@/lib/analysis/provider";
import { DemoAnalysisProvider } from "@/lib/analysis/demo-provider";

export function getAnalysisProvider(): AnalysisProvider {
  // Add a server-only adapter here when an approved vision model is selected.
  // The adapter must return the shared typed schema and must never expose keys.
  return new DemoAnalysisProvider();
}

export type { AnalysisProvider } from "@/lib/analysis/provider";
