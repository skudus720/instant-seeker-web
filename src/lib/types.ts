export type ConfidenceLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type RiskPreference = "conservative" | "balanced" | "opportunistic";
export type MatchSource = "model-extracted" | "user-provided" | "demo";
export type UserRole = "user" | "sub_admin" | "admin" | "super_admin";
export type AccountStatus =
  "active" | "suspended" | "deletion_pending" | "anonymized" | "deleted";

export interface AnalysisSettings {
  riskPreference?: RiskPreference;
  visibleFixtureNotes?: string;
  responseMode?: "full" | "team-selections";
  configuration?: {
    id: string;
    version: number;
    providerName: string;
    modelIdentifier: string;
    promptTemplateVersion: string;
    extractionInstructions: string;
    analysisInstructions: string;
    confidenceThresholds: Record<string, number>;
    riskThresholds: Record<string, number>;
    maximumMatches: number;
    timeoutMs: number;
  };
}

export interface DetectedMatch {
  id: string;
  fixture: string;
  visibleMarket: string;
  selectedTeam?: string;
  predictedCategory: string;
  estimatedProbability: number;
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  source?: MatchSource;
  explanation: string;
}

export interface AnalysisSummary {
  riskPosture: RiskPreference;
  overallSignal: string;
  decisionNote: string;
}

export interface AnalysisResult {
  id: string;
  label: "Demonstration analysis" | "Model analysis";
  provider: string;
  summary?: AnalysisSummary;
  detectedMatches: DetectedMatch[];
  extractedVisibleText: string[];
  parsingWarnings: string[];
  screenshotQuality: "limited" | "acceptable" | "good";
  createdAt: string;
  disclaimer: string;
}

export interface TransientAnalysisImage {
  bytes: Uint8Array;
  mimeType: string;
}

export interface AnalysisRequest {
  authenticatedUserId: string;
  image: TransientAnalysisImage;
  settings?: AnalysisSettings;
}

export interface PublicWin {
  id: string;
  displayName: string;
  amount: number;
  currency: string;
  verifiedAt: string;
  wonAt: string;
  sample: boolean;
}

export interface PublicReview {
  id: string;
  displayName: string;
  rating: number;
  body: string;
  publishedAt: string;
  verifiedMember: boolean;
  moderationStatus: "approved" | "pending" | "rejected";
}

export interface PublicStats {
  verifiedWinners: number;
  totalVerifiedAmountWon: number;
  screenshotsAnalyzed: number;
  averagePublishedRating: number | null;
  currency: string;
  demo: boolean;
}

export interface ActiveAiSubscription {
  id: string;
  planCode: "gold" | "platinum" | "diamond";
  status: "active";
  startsAt: string;
  expiresAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  accessStatus: "payment_pending" | "active" | "refunded";
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  lastActiveAt: string | null;
  momoNumber: string | null;
  subscription: ActiveAiSubscription | null;
  demo: boolean;
}
