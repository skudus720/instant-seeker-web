import "server-only";

import type { AnalysisRequest, AnalysisResult } from "@/lib/types";

export interface AnalysisProvider {
  readonly name: string;
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
}
