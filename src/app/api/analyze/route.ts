import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import { getAnalysisProvider } from "@/lib/analysis";
import {
  hasRoleBasedAnalysisAccess,
  isAccountOperational,
} from "@/lib/admin/permissions";
import { getCurrentUser } from "@/lib/auth";
import { appConfig, isDemoMode } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSubscriptionActive } from "@/lib/subscriptions/access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  allowedDetectedMimeTypes,
  validateAnalysisSettings,
  validateUploadMetadata,
} from "@/lib/validation/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const user = await getCurrentUser();
  if (!user) return errorResponse("Sign in to analyze a screenshot.", 401);
  if (!user.demo && !isAccountOperational(user)) {
    return errorResponse("This account cannot start a new analysis.", 403);
  }
  const hasIncludedAccess = hasRoleBasedAnalysisAccess(user.role);
  if (!user.demo && !hasIncludedAccess && user.accessStatus !== "active") {
    return errorResponse("Complete the account access payment first.", 402);
  }
  if (
    !user.demo &&
    !hasIncludedAccess &&
    !isSubscriptionActive(user.subscription)
  ) {
    return errorResponse(
      "Choose an active AI access plan before starting an analysis.",
      402,
    );
  }
  if (!(await checkRateLimit("analysis", 10, 60 * 60_000))) {
    return errorResponse(
      "Analysis limit reached. Please try again later.",
      429,
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > appConfig.maxUploadBytes + 1_000_000) {
    return errorResponse("The upload is larger than 10 MB.", 413);
  }

  const formData = await request.formData();
  const file = formData.get("screenshot");
  if (!(file instanceof File)) {
    return errorResponse("Choose a screenshot to analyze.", 400);
  }
  const rawRiskPreference = formData.get("riskPreference");
  const rawResponseMode = formData.get("responseMode");
  const rawVisibleFixtureNotes = formData.get("visibleFixtureNotes");
  const settings = validateAnalysisSettings({
    riskPreference:
      typeof rawRiskPreference === "string" ? rawRiskPreference : undefined,
    responseMode:
      typeof rawResponseMode === "string" ? rawResponseMode : undefined,
    visibleFixtureNotes:
      typeof rawVisibleFixtureNotes === "string"
        ? rawVisibleFixtureNotes
        : undefined,
  });
  if (!settings.success) {
    return errorResponse(
      settings.error.issues[0]?.message || "Invalid analysis settings.",
      400,
    );
  }

  const metadata = validateUploadMetadata({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!metadata.success) {
    return errorResponse(
      metadata.error.issues[0]?.message || "Invalid image.",
      400,
    );
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  try {
    const detectedType = await fileTypeFromBuffer(originalBuffer);
    if (!detectedType || !allowedDetectedMimeTypes.has(detectedType.mime)) {
      return errorResponse(
        "The file contents must be a JPG, PNG, or WebP image.",
        400,
      );
    }

    const adminSupabase = createAdminSupabaseClient();
    const analysisId = randomUUID();
    const processingStartedAt = new Date().toISOString();
    let activeConfiguration: Record<string, unknown> | null = null;

    if (!isDemoMode && adminSupabase) {
      const [{ data }, featureFlag] = await Promise.all([
        adminSupabase
          .from("ai_config_versions")
          .select(
            "id, version_number, provider_name, model_identifier, prompt_template_version, extraction_instructions, analysis_instructions, confidence_thresholds, risk_thresholds, maximum_screenshot_bytes, accepted_mime_types, maximum_matches, analysis_timeout_ms, per_user_daily_limit",
          )
          .eq("status", "active")
          .maybeSingle(),
        adminSupabase
          .from("feature_flags")
          .select("enabled")
          .eq("key", "screenshot_analysis")
          .maybeSingle(),
      ]);
      if (featureFlag.data?.enabled === false) {
        return errorResponse(
          "Screenshot analysis is temporarily unavailable.",
          503,
        );
      }
      activeConfiguration = data;
      if (
        data &&
        (file.size > Number(data.maximum_screenshot_bytes) ||
          !Array.isArray(data.accepted_mime_types) ||
          !data.accepted_mime_types.includes(detectedType.mime))
      ) {
        return errorResponse(
          "The screenshot does not match the active analysis configuration.",
          400,
        );
      }
      if (data?.per_user_daily_limit) {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const { count } = await adminSupabase
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfDay.toISOString());
        if ((count || 0) >= Number(data.per_user_daily_limit)) {
          return errorResponse("Daily analysis limit reached.", 429);
        }
      }
    }

    const provider = getAnalysisProvider();
    if (!isDemoMode) {
      if (!adminSupabase) {
        return errorResponse(
          "Server persistence is not fully configured.",
          503,
        );
      }
      const { error: createError } = await adminSupabase
        .from("analyses")
        .insert({
          id: analysisId,
          user_id: user.id,
          private_image_path: null,
          provider: provider.name,
          model_identifier:
            typeof activeConfiguration?.model_identifier === "string"
              ? activeConfiguration.model_identifier
              : null,
          configuration_version_id:
            typeof activeConfiguration?.id === "string"
              ? activeConfiguration.id
              : null,
          status: "processing",
          processing_started_at: processingStartedAt,
          upload_metadata: {
            size_bytes: file.size,
            detected_mime_type: detectedType.mime,
            detected_extension: detectedType.ext,
            image_retention: "none",
          },
        });
      if (createError) {
        return errorResponse("The analysis job could not be created.", 500);
      }
    }

    try {
      const configuredSettings = activeConfiguration
        ? {
            ...settings.data,
            configuration: {
              id: String(activeConfiguration.id),
              version: Number(activeConfiguration.version_number),
              providerName: String(activeConfiguration.provider_name),
              modelIdentifier: String(activeConfiguration.model_identifier),
              promptTemplateVersion: String(
                activeConfiguration.prompt_template_version,
              ),
              extractionInstructions: String(
                activeConfiguration.extraction_instructions,
              ),
              analysisInstructions: String(
                activeConfiguration.analysis_instructions,
              ),
              confidenceThresholds:
                activeConfiguration.confidence_thresholds as Record<
                  string,
                  number
                >,
              riskThresholds: activeConfiguration.risk_thresholds as Record<
                string,
                number
              >,
              maximumMatches: Number(activeConfiguration.maximum_matches),
              timeoutMs: Number(activeConfiguration.analysis_timeout_ms),
            },
          }
        : settings.data;
      const result = await provider.analyze({
        authenticatedUserId: user.id,
        image: {
          bytes: originalBuffer,
          mimeType: detectedType.mime,
        },
        settings: configuredSettings,
      });
      if (
        activeConfiguration?.maximum_matches &&
        result.detectedMatches.length >
          Number(activeConfiguration.maximum_matches)
      ) {
        throw new Error("Configured maximum match count exceeded.");
      }

      if (!isDemoMode && adminSupabase) {
        const confidenceLevels = result.detectedMatches.map(
          (match) => match.confidence,
        );
        const overallConfidence = confidenceLevels.includes("low")
          ? "low"
          : confidenceLevels.includes("medium")
            ? "medium"
            : confidenceLevels.length
              ? "high"
              : null;
        const { error: updateError } = await adminSupabase
          .from("analyses")
          .update({
            extracted_matches: result.detectedMatches,
            result,
            provider: provider.name,
            status: "completed",
            original_provider_response: result,
            overall_confidence_band: overallConfidence,
            processing_completed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - requestStartedAt,
          })
          .eq("id", analysisId);
        if (updateError) {
          return errorResponse("The analysis could not be saved.", 500);
        }
      }

      return NextResponse.json(
        { result },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (!isDemoMode && adminSupabase) {
        await adminSupabase
          .from("analyses")
          .update({
            status: "failed",
            processing_completed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - requestStartedAt,
            error_code: "ANALYSIS_PROVIDER_FAILURE",
            error_message_redacted:
              error instanceof Error && error.name === "ZodError"
                ? "The provider response failed result validation."
                : "The configured provider did not complete the analysis.",
          })
          .eq("id", analysisId);
      }
      return errorResponse(
        "Analysis failed safely. Please try another screenshot.",
        500,
      );
    }
  } finally {
    originalBuffer.fill(0);
  }
}
