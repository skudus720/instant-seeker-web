export type ConfidenceLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";

export interface DetectedMatch {
  id: string;
  fixture: string;
  visibleMarket: string;
  predictedCategory: string;
  estimatedProbability: number;
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  explanation: string;
}

export interface AnalysisResult {
  id: string;
  label: "Demonstration analysis" | "Model analysis";
  provider: string;
  detectedMatches: DetectedMatch[];
  extractedVisibleText: string[];
  parsingWarnings: string[];
  screenshotQuality: "limited" | "acceptable" | "good";
  createdAt: string;
  disclaimer: string;
}

export interface AnalysisRequest {
  authenticatedUserId: string;
  secureImageReference: string;
  settings?: {
    riskPreference?: "conservative" | "balanced";
  };
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

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  demo: boolean;
}
