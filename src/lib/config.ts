export const appConfig = {
  name: "Instant Seeker",
  description:
    "Independent AI-assisted virtual-match screenshot analysis with probability, confidence, and risk insights.",
  currency: process.env.NEXT_PUBLIC_DISPLAY_CURRENCY || "GHS",
  maxUploadBytes: 10 * 1024 * 1024,
  supportedImageTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  contactEmail: "support@instantseeker.example",
} as const;

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const isSupabaseConfigured = Boolean(
  supabaseConfig.url && supabaseConfig.anonKey,
);

export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !isSupabaseConfigured;

export const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";
