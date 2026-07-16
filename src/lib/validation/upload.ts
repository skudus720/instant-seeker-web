import { z } from "zod";
import { appConfig } from "@/lib/config";

const uploadMetadataSchema = z.object({
  name: z.string().min(1, "Choose an image file."),
  size: z
    .number()
    .positive("The selected file is empty.")
    .max(
      appConfig.maxUploadBytes,
      `Images must be ${appConfig.maxUploadBytes / 1024 / 1024} MB or smaller.`,
    ),
  type: z.enum(appConfig.supportedImageTypes, {
    error: "Use a JPG, PNG, or WebP image.",
  }),
});

export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

export function validateUploadMetadata(metadata: {
  name: string;
  size: number;
  type: string;
}) {
  return uploadMetadataSchema.safeParse(metadata);
}

export const allowedDetectedMimeTypes = new Set<string>(
  appConfig.supportedImageTypes,
);

export const riskPreferenceOptions = [
  "conservative",
  "balanced",
  "opportunistic",
] as const;

function normalizeVisibleFixtureNotes(value: string | undefined) {
  const normalized = value
    ?.replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n");
  return normalized ? normalized : undefined;
}

export const analysisSettingsSchema = z.object({
  riskPreference: z.enum(riskPreferenceOptions).default("balanced"),
  responseMode: z.enum(["full", "team-selections"]).default("full"),
  visibleFixtureNotes: z
    .string()
    .max(1_200, "Visible fixture notes must be 1,200 characters or fewer.")
    .optional()
    .transform(normalizeVisibleFixtureNotes),
  extractedVisibleText: z
    .string()
    .max(
      20_000,
      "Extracted screenshot text must be 20,000 characters or fewer.",
    )
    .optional()
    .transform(normalizeVisibleFixtureNotes),
});

export type ValidatedAnalysisSettings = z.infer<typeof analysisSettingsSchema>;

export function validateAnalysisSettings(settings: {
  riskPreference?: string;
  responseMode?: string;
  visibleFixtureNotes?: string;
  extractedVisibleText?: string;
}) {
  return analysisSettingsSchema.safeParse(settings);
}
