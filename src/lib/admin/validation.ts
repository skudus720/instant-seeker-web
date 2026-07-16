import { z } from "zod";
import { normalizeGhanaMomoNumber } from "@/lib/validation/auth";

export const adminReasonSchema = z
  .string()
  .trim()
  .min(5, "Enter a reason of at least 5 characters.")
  .max(1000, "Use 1,000 characters or fewer.");

/** Super-admin onboarding accepts loosely filled partner details. */
export const createSubAdminSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => value || "Sub-admin"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter an email address.")
    .max(254),
  momoNumber: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return "";
      const normalized = normalizeGhanaMomoNumber(value);
      return /^\+233[25]\d{8}$/.test(normalized) ? normalized : value;
    }),
  password: z
    .string()
    .min(1, "Enter a temporary password.")
    .max(72, "Use no more than 72 characters."),
  ageConfirmed: z.any().optional(),
  authorizationConfirmed: z.any().optional(),
  reason: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || "Created by super administrator"),
  returnTo: z.string().optional(),
});

export function resolveCreateSubAdminMomo(momoNumber: string) {
  const normalized = normalizeGhanaMomoNumber(momoNumber);
  if (/^\+233[25]\d{8}$/.test(normalized)) {
    return { forAuth: normalized, forProfile: normalized };
  }
  // Auth trigger still requires a Ghana MoMo shape; store null on the profile.
  return { forAuth: "+233240000000", forProfile: null as string | null };
}

export const dateRangeSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("30d"),
});

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  status: z.string().trim().max(60).optional().default(""),
  role: z
    .enum(["", "user", "sub_admin", "admin", "super_admin"])
    .optional()
    .default(""),
  sort: z.string().trim().max(60).optional().default("created_desc"),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const adminMutationSchema = z.object({
  kind: z.enum([
    "user_suspend",
    "user_suspend_until",
    "user_reactivate",
    "user_change_role",
    "user_reset_rate_limit",
    "user_request_anonymization",
    "user_request_deletion",
    "analysis_retry",
    "analysis_rerun",
    "analysis_flag",
    "analysis_confirm",
    "analysis_false_positive",
    "analysis_parsing_error",
    "analysis_correction",
    "analysis_remove_image",
    "analysis_mark_stale_failed",
    "review_approve",
    "review_reject",
    "review_hide",
    "review_restore",
    "review_redact",
    "win_begin_review",
    "win_verify",
    "win_reject",
    "win_request_evidence",
    "win_publish",
    "win_unpublish",
    "win_revoke",
    "win_redact",
    "content_publish",
    "ai_config_activate",
  ]),
  targetId: z.string().uuid(),
  reason: adminReasonSchema,
  value: z.string().max(12_000).optional().default(""),
});

export const adminNoteSchema = z.object({
  targetType: z.enum(["user", "analysis", "win_record", "review"]),
  targetId: z.string().uuid(),
  body: z.string().trim().min(2).max(4000),
});

export const contentDraftSchema = z
  .object({
    contentKey: z.string().regex(/^[a-z0-9_.-]{2,80}$/),
    content: z
      .string()
      .trim()
      .min(2)
      .max(30_000)
      .transform((value, context) => {
        try {
          const parsed: unknown = JSON.parse(value);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            context.addIssue({
              code: "custom",
              message: "Content must be a JSON object.",
            });
            return z.NEVER;
          }
          return parsed as Record<string, unknown>;
        } catch {
          context.addIssue({
            code: "custom",
            message: "Enter valid JSON content.",
          });
          return z.NEVER;
        }
      }),
    reason: adminReasonSchema,
  })
  .superRefine((draft, context) => {
    const serialized = JSON.stringify(draft.content);
    if (
      /\b(hack|crack|bypass|guarantees? (?:a )?win|will (?:certainly|definitely) win|risk[- ]free betting|fixed winner)\b/i.test(
        serialized,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message:
          "Public content contains prohibited access or certainty claims.",
      });
    }
  });

export const aiConfigDraftSchema = z
  .object({
    providerName: z.string().trim().min(2).max(80),
    modelIdentifier: z.string().trim().min(2).max(160),
    promptTemplateVersion: z.string().trim().min(1).max(80),
    extractionInstructions: z.string().trim().min(10).max(12_000),
    analysisInstructions: z.string().trim().min(10).max(12_000),
    confidenceThresholds: z
      .string()
      .transform((value, context) =>
        parseThresholds(value, context, "confidence"),
      ),
    riskThresholds: z
      .string()
      .transform((value, context) => parseThresholds(value, context, "risk")),
    maximumScreenshotBytes: z.coerce
      .number()
      .int()
      .min(1024)
      .max(20 * 1024 * 1024),
    acceptedMimeTypes: z
      .array(z.enum(["image/jpeg", "image/png", "image/webp"]))
      .min(1),
    maximumMatches: z.coerce.number().int().min(1).max(100),
    analysisTimeoutMs: z.coerce.number().int().min(1000).max(180_000),
    retryLimit: z.coerce.number().int().min(0).max(10),
    perUserDailyLimit: z.coerce.number().int().min(1).max(1000),
    featureFlags: z.string().transform((value, context) => {
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          context.addIssue({
            code: "custom",
            message: "Feature flags must be a JSON object.",
          });
          return z.NEVER;
        }
        return parsed as Record<string, unknown>;
      } catch {
        context.addIssue({
          code: "custom",
          message: "Feature flags must be valid JSON.",
        });
        return z.NEVER;
      }
    }),
    configurationNotes: z.string().trim().min(5).max(4000),
    reason: adminReasonSchema,
  })
  .superRefine((configuration, context) => {
    const instructions = `${configuration.extractionInstructions} ${configuration.analysisInstructions}`;
    if (
      /\b(hack|crack|bypass|guarantees? (?:a )?win|will (?:certainly|definitely) win|risk[- ]free betting|fixed winner)\b/i.test(
        instructions,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["analysisInstructions"],
        message:
          "Instructions must use probability and uncertainty framing without prohibited access or guaranteed-outcome claims.",
      });
    }
  });

function parseThresholds(
  value: string,
  context: z.RefinementCtx,
  label: string,
) {
  try {
    const parsed = z
      .object({
        low: z.number().min(0).max(1),
        medium: z.number().min(0).max(1),
        high: z.number().min(0).max(1),
      })
      .parse(JSON.parse(value));
    return parsed;
  } catch {
    context.addIssue({
      code: "custom",
      message: `${label[0]?.toUpperCase()}${label.slice(1)} thresholds must contain low, medium, and high values between 0 and 1.`,
    });
    return z.NEVER;
  }
}

export const settingUpdateSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.-]{2,100}$/),
  category: z.enum([
    "general",
    "safety",
    "privacy",
    "limits",
    "features",
    "security",
  ]),
  value: z
    .string()
    .max(12_000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({
          code: "custom",
          message: "Setting value must be valid JSON.",
        });
        return z.NEVER;
      }
    }),
  isSensitive: z.boolean().default(false),
  description: z.string().trim().max(500).default(""),
  reason: adminReasonSchema,
});

export const featureFlagUpdateSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.-]{2,100}$/),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  reason: adminReasonSchema,
});
