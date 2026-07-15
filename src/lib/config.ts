const configuredSignupFee = Number(
  process.env.NEXT_PUBLIC_SIGNUP_FEE_GHS || "50",
);
const signupFeeAmount =
  Number.isFinite(configuredSignupFee) && configuredSignupFee > 0
    ? configuredSignupFee
    : 50;

export const appConfig = {
  name: "Instant Seeker",
  description:
    "Independent AI-assisted virtual-match screenshot analysis with probability, confidence, and risk insights.",
  currency: process.env.NEXT_PUBLIC_DISPLAY_CURRENCY || "GHS",
  maxUploadBytes: 10 * 1024 * 1024,
  supportedImageTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  contactEmail: "support@instantseeker.example",
  signupFeeAmount,
  signupFeeAmountMinor: Math.round(signupFeeAmount * 100),
  signupFeeCurrency: "GHS",
} as const;

export const paymentConfig = {
  provider: "paystack",
  secretKey: process.env.PAYSTACK_SECRET_KEY,
};

export const isPaymentConfigured = Boolean(paymentConfig.secretKey);

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const isSupabaseConfigured = Boolean(
  supabaseConfig.url && supabaseConfig.anonKey,
);

export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !isSupabaseConfigured;

export const analysisProviderConfig = {
  provider: process.env.ANALYSIS_PROVIDER || "demo",
  endpoint: process.env.ANALYSIS_PROVIDER_ENDPOINT,
  apiKey: process.env.ANALYSIS_PROVIDER_API_KEY,
};

export const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export const referralConfig = {
  cookieName: "instant_seeker_referral",
  attributionSecret: process.env.REFERRAL_ATTRIBUTION_SECRET,
  attributionDays: boundedInteger(
    process.env.REFERRAL_ATTRIBUTION_DAYS,
    30,
    1,
    365,
  ),
  commissionHoldDays: boundedInteger(
    process.env.REFERRAL_COMMISSION_HOLD_DAYS,
    0,
    0,
    365,
  ),
  subAdminRateBasisPoints: 7000,
  superAdminRateBasisPoints: 3000,
} as const;
