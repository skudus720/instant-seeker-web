import "server-only";

import { getAnalysisProvider } from "@/lib/analysis";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AnalysisSettings } from "@/lib/types";

interface RetryOutcome {
  success: boolean;
  message: string;
}

export async function processAnalysisRetryJob(
  jobId: string,
): Promise<RetryOutcome> {
  const admin = createAdminSupabaseClient();
  if (!admin)
    return { success: false, message: "Retry processor is not configured." };
  const startedAt = Date.now();
  const { data: job, error: claimError } = await admin
    .from("analysis_retry_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id, analysis_id, use_active_configuration")
    .maybeSingle();
  if (claimError || !job) {
    return {
      success: false,
      message: "Retry job is no longer available for processing.",
    };
  }

  try {
    const { data: analysis } = await admin
      .from("analyses")
      .select(
        "id, user_id, private_image_path, configuration_version_id, upload_metadata",
      )
      .eq("id", job.analysis_id)
      .maybeSingle();
    if (!analysis?.private_image_path)
      throw new Error("Private screenshot is unavailable.");

    const configQuery = admin
      .from("ai_config_versions")
      .select(
        "id, version_number, provider_name, model_identifier, prompt_template_version, extraction_instructions, analysis_instructions, confidence_thresholds, risk_thresholds, maximum_matches, analysis_timeout_ms",
      );
    const { data: configuration } = job.use_active_configuration
      ? await configQuery.eq("status", "active").maybeSingle()
      : analysis.configuration_version_id
        ? await configQuery
            .eq("id", analysis.configuration_version_id)
            .maybeSingle()
        : { data: null };

    const settings: AnalysisSettings = configuration
      ? {
          configuration: {
            id: String(configuration.id),
            version: Number(configuration.version_number),
            providerName: String(configuration.provider_name),
            modelIdentifier: String(configuration.model_identifier),
            promptTemplateVersion: String(
              configuration.prompt_template_version,
            ),
            extractionInstructions: String(
              configuration.extraction_instructions,
            ),
            analysisInstructions: String(configuration.analysis_instructions),
            confidenceThresholds: configuration.confidence_thresholds as Record<
              string,
              number
            >,
            riskThresholds: configuration.risk_thresholds as Record<
              string,
              number
            >,
            maximumMatches: Number(configuration.maximum_matches),
            timeoutMs: Number(configuration.analysis_timeout_ms),
          },
        }
      : {};
    const legacyImagePath = String(analysis.private_image_path);
    const { data: imageBlob, error: downloadError } = await admin.storage
      .from("analysis-screenshots")
      .download(legacyImagePath);
    if (downloadError || !imageBlob) {
      throw new Error("Private screenshot is unavailable.");
    }
    const imageBytes = Buffer.from(await imageBlob.arrayBuffer());
    try {
      const uploadMetadata =
        analysis.upload_metadata &&
        typeof analysis.upload_metadata === "object" &&
        !Array.isArray(analysis.upload_metadata)
          ? (analysis.upload_metadata as Record<string, unknown>)
          : {};
      const provider = getAnalysisProvider();
      const result = await provider.analyze({
        authenticatedUserId: String(analysis.user_id),
        image: {
          bytes: imageBytes,
          mimeType:
            typeof uploadMetadata.detected_mime_type === "string"
              ? uploadMetadata.detected_mime_type
              : imageBlob.type || "application/octet-stream",
        },
        settings,
      });
      if (
        configuration?.maximum_matches &&
        result.detectedMatches.length > Number(configuration.maximum_matches)
      ) {
        throw new Error("Configured maximum match count exceeded.");
      }
      const { error: completeError } = await admin.rpc(
        "complete_analysis_retry_job",
        {
          p_job_id: job.id,
          p_provider: provider.name,
          p_model_identifier: configuration?.model_identifier || null,
          p_configuration_version_id: configuration?.id || null,
          p_result: result,
          p_processing_duration_ms: Date.now() - startedAt,
        },
      );
      if (completeError) throw new Error("Retry result could not be stored.");
    } finally {
      imageBytes.fill(0);
      const { error: removeError } = await admin.storage
        .from("analysis-screenshots")
        .remove([legacyImagePath]);
      if (removeError) {
        throw new Error("Legacy screenshot cleanup failed.");
      }
      await admin
        .from("analyses")
        .update({ private_image_path: null })
        .eq("id", analysis.id);
    }
    return {
      success: true,
      message: "Retry completed; the legacy screenshot was discarded.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.includes("cleanup")
          ? "Legacy screenshot cleanup failed and needs immediate attention."
          : error.message.includes("screenshot")
            ? "Private screenshot is unavailable."
            : "The retry provider did not complete successfully."
        : "The retry provider did not complete successfully.";
    await admin.rpc("fail_analysis_retry_job", {
      p_job_id: job.id,
      p_error_message_redacted: message,
      p_processing_duration_ms: Date.now() - startedAt,
    });
    await admin.from("system_events").insert({
      severity: "error",
      source: "analysis-retry-processor",
      event_type: "analysis_retry_failed",
      message,
      details_redacted: { job_id: job.id, analysis_id: job.analysis_id },
      request_duration_ms: Date.now() - startedAt,
    });
    return { success: false, message };
  }
}
