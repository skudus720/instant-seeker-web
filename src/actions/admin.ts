"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdminPermission } from "@/lib/admin/permissions";
import { processAnalysisRetryJob } from "@/lib/admin/retry-processor";
import {
  adminMutationSchema,
  adminNoteSchema,
  aiConfigDraftSchema,
  contentDraftSchema,
  createSubAdminSchema,
  featureFlagUpdateSchema,
  settingUpdateSchema,
} from "@/lib/admin/validation";
import { requirePermission } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AdminMutationKind = ReturnType<typeof adminMutationSchema.parse>["kind"];

const mutationPermissions: Record<AdminMutationKind, AdminPermission> = {
  user_suspend: "users:manage",
  user_suspend_until: "users:manage",
  user_reactivate: "users:manage",
  user_change_role: "users:roles",
  user_reset_rate_limit: "users:manage",
  user_request_anonymization: "users:manage",
  user_request_deletion: "users:manage",
  analysis_retry: "analyses:manage",
  analysis_rerun: "analyses:manage",
  analysis_flag: "analyses:manage",
  analysis_confirm: "analyses:manage",
  analysis_false_positive: "analyses:manage",
  analysis_parsing_error: "analyses:manage",
  analysis_correction: "analyses:manage",
  analysis_remove_image: "analyses:manage",
  analysis_mark_stale_failed: "system:manage",
  review_approve: "moderation:manage",
  review_reject: "moderation:manage",
  review_hide: "moderation:manage",
  review_restore: "moderation:manage",
  review_redact: "moderation:manage",
  win_begin_review: "moderation:manage",
  win_verify: "moderation:manage",
  win_reject: "moderation:manage",
  win_request_evidence: "moderation:manage",
  win_publish: "moderation:manage",
  win_unpublish: "moderation:manage",
  win_revoke: "moderation:manage",
  win_redact: "moderation:manage",
  content_publish: "content:manage",
  ai_config_activate: "ai_config:activate",
};

function safeReturnTo(value: FormDataEntryValue | null, fallback = "/admin") {
  const path = typeof value === "string" ? value : fallback;
  return path.startsWith("/admin") && !path.startsWith("//") ? path : fallback;
}

function resultUrl(
  returnTo: string,
  kind: "success" | "error",
  message: string,
) {
  const url = new URL(returnTo, "http://instant-seeker.local");
  url.searchParams.set("admin_result", kind);
  url.searchParams.set("admin_message", message.slice(0, 180));
  return `${url.pathname}${url.search}`;
}

async function requestMetadata() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return {
    ip_address: forwarded || requestHeaders.get("x-real-ip") || undefined,
    user_agent: requestHeaders.get("user-agent")?.slice(0, 500) || undefined,
    request_id: requestHeaders.get("x-request-id")?.slice(0, 120) || undefined,
  };
}

async function enforceMutationRateLimit(actorId: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return;
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("administrator_id", actorId)
    .gte("created_at", since);
  if ((count || 0) >= 60) {
    throw new Error(
      "Too many administrative changes. Wait one minute and try again.",
    );
  }
}

function publicErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  const allowed = [
    "reason",
    "forbidden",
    "authorization",
    "already processing",
    "active retry already exists",
    "must be verified",
    "consent is required",
    "recorded user consent",
    "cannot change their own role",
    "only a super administrator",
    "not found",
    "future",
    "invalid",
    "already been registered",
    "already registered",
    "mobile money",
    "password",
    "email",
  ];
  return allowed.some((phrase) => normalized.includes(phrase))
    ? message.slice(0, 180)
    : "The administrative change could not be completed.";
}

export async function adminMutationAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const parsed = adminMutationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid administrative action.",
      ),
    );
  }
  const permission = mutationPermissions[parsed.data.kind];
  const actor = await requirePermission(permission);
  if (actor.demo) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        "Mutations are disabled in demo admin preview.",
      ),
    );
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect(resultUrl(returnTo, "error", "Supabase is not configured."));
  }

  try {
    await enforceMutationRateLimit(actor.id);
    const metadata = await requestMetadata();
    const { kind, targetId, reason, value } = parsed.data;
    let result: { data?: unknown; error: { message: string } | null };

    if (kind.startsWith("user_")) {
      const operations: Partial<Record<AdminMutationKind, string>> = {
        user_suspend: "suspend",
        user_suspend_until: "suspend_until",
        user_reactivate: "reactivate",
        user_change_role: "change_role",
        user_reset_rate_limit: "reset_rate_limit",
        user_request_anonymization: "request_anonymization",
        user_request_deletion: "request_deletion",
      };
      result = await supabase.rpc("admin_manage_user", {
        p_target_id: targetId,
        p_operation: operations[kind],
        p_value: value,
        p_reason: reason,
        p_request_metadata: metadata,
      });
    } else if (kind === "analysis_retry" || kind === "analysis_rerun") {
      const { data: retryableAnalysis, error: retryableError } = await supabase
        .from("analyses")
        .select("private_image_path")
        .eq("id", targetId)
        .maybeSingle();
      if (retryableError || !retryableAnalysis?.private_image_path) {
        throw new Error(
          "The screenshot was discarded after processing. Ask the member to submit it again for a new analysis.",
        );
      }
      result = await supabase.rpc("admin_queue_analysis_retry", {
        p_analysis_id: targetId,
        p_use_active_configuration: kind === "analysis_rerun",
        p_reason: reason,
        p_request_metadata: metadata,
      });
      if (!result.error && typeof result.data === "string") {
        const retry = await processAnalysisRetryJob(result.data);
        if (!retry.success) throw new Error(retry.message);
      }
    } else if (kind === "analysis_mark_stale_failed") {
      result = await supabase.rpc("admin_mark_stale_analysis_failed", {
        p_analysis_id: targetId,
        p_reason: reason,
        p_request_metadata: metadata,
      });
    } else if (kind === "analysis_correction") {
      let correction: unknown;
      try {
        correction = JSON.parse(value);
      } catch {
        throw new Error("Invalid correction JSON.");
      }
      result = await supabase.rpc("admin_correct_analysis", {
        p_analysis_id: targetId,
        p_correction: correction,
        p_reason: reason,
        p_request_metadata: metadata,
      });
    } else if (kind === "analysis_remove_image") {
      result = await supabase.rpc("admin_remove_analysis_image", {
        p_analysis_id: targetId,
        p_reason: reason,
        p_request_metadata: metadata,
      });
      if (!result.error) {
        const removedPath =
          typeof result.data === "string" ? result.data : null;
        if (removedPath) {
          await createAdminSupabaseClient()
            ?.storage.from("analysis-screenshots")
            .remove([removedPath]);
        }
      }
    } else if (kind.startsWith("analysis_")) {
      result = await supabase.rpc("admin_review_analysis", {
        p_analysis_id: targetId,
        p_operation: kind.replace("analysis_", ""),
        p_reason: reason,
        p_request_metadata: metadata,
      });
    } else if (kind.startsWith("review_")) {
      result = await supabase.rpc("admin_moderate_review", {
        p_review_id: targetId,
        p_operation: kind.replace("review_", ""),
        p_reason: reason,
        p_redacted_body: kind === "review_redact" ? value : null,
        p_request_metadata: metadata,
      });
    } else if (kind.startsWith("win_")) {
      result = await supabase.rpc("admin_moderate_win_record", {
        p_record_id: targetId,
        p_operation: kind.replace("win_", ""),
        p_reason: reason,
        p_value: value || null,
        p_request_metadata: metadata,
      });
    } else if (kind === "content_publish") {
      result = await supabase.rpc("admin_publish_content_version", {
        p_version_id: targetId,
        p_reason: reason,
        p_request_metadata: metadata,
      });
    } else {
      result = await supabase.rpc("admin_activate_ai_config", {
        p_config_id: targetId,
        p_reason: reason,
        p_request_metadata: metadata,
      });
    }
    if (result.error) throw new Error(result.error.message);
  } catch (error) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        publicErrorMessage(
          error instanceof Error ? error.message : "Unknown failure",
        ),
      ),
    );
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/");
  redirect(
    resultUrl(
      returnTo,
      "success",
      "Administrative change completed and audited.",
    ),
  );
}

export async function addAdminNoteAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const parsed = adminNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid note.",
      ),
    );
  }
  const permission: AdminPermission =
    parsed.data.targetType === "user"
      ? "users:manage"
      : parsed.data.targetType === "analysis"
        ? "analyses:manage"
        : "moderation:manage";
  const actor = await requirePermission(permission);
  if (actor.demo)
    redirect(
      resultUrl(returnTo, "error", "Notes are disabled in demo preview."),
    );
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_add_note", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_body: parsed.data.body,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error)
    redirect(resultUrl(returnTo, "error", publicErrorMessage(error.message)));
  revalidatePath(returnTo);
  redirect(resultUrl(returnTo, "success", "Private note added and audited."));
}

export async function saveContentDraftAction(
  formData: FormData,
): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/content");
  const parsed = contentDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid content draft.",
      ),
    );
  const actor = await requirePermission("content:manage");
  if (actor.demo)
    redirect(
      resultUrl(returnTo, "error", "Drafts are disabled in demo preview."),
    );
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_save_content_version", {
    p_content_key: parsed.data.contentKey,
    p_content: parsed.data.content,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error)
    redirect(resultUrl(returnTo, "error", publicErrorMessage(error.message)));
  revalidatePath("/admin/content");
  redirect(resultUrl(returnTo, "success", "Draft version created."));
}

export async function saveAiConfigAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(
    formData.get("returnTo"),
    "/admin/ai-configuration",
  );
  const raw = Object.fromEntries(formData);
  const parsed = aiConfigDraftSchema.safeParse({
    ...raw,
    acceptedMimeTypes: formData.getAll("acceptedMimeTypes"),
  });
  if (!parsed.success)
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid AI configuration.",
      ),
    );
  const actor = await requirePermission("ai_config:manage");
  if (actor.demo)
    redirect(
      resultUrl(
        returnTo,
        "error",
        "AI configuration is disabled in demo preview.",
      ),
    );
  const value = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_save_ai_config", {
    p_config: {
      provider_name: value.providerName,
      model_identifier: value.modelIdentifier,
      prompt_template_version: value.promptTemplateVersion,
      extraction_instructions: value.extractionInstructions,
      analysis_instructions: value.analysisInstructions,
      confidence_thresholds: value.confidenceThresholds,
      risk_thresholds: value.riskThresholds,
      maximum_screenshot_bytes: value.maximumScreenshotBytes,
      accepted_mime_types: value.acceptedMimeTypes,
      maximum_matches: value.maximumMatches,
      analysis_timeout_ms: value.analysisTimeoutMs,
      retry_limit: value.retryLimit,
      per_user_daily_limit: value.perUserDailyLimit,
      feature_flags: value.featureFlags,
      configuration_notes: value.configurationNotes,
    },
    p_reason: value.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error)
    redirect(resultUrl(returnTo, "error", publicErrorMessage(error.message)));
  revalidatePath("/admin/ai-configuration");
  redirect(resultUrl(returnTo, "success", "AI configuration draft created."));
}

export async function updateSettingAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/settings");
  const parsed = settingUpdateSchema.safeParse({
    ...Object.fromEntries(formData),
    isSensitive: formData.get("isSensitive") === "true",
  });
  if (!parsed.success)
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid setting.",
      ),
    );
  if (
    parsed.data.isSensitive &&
    formData.get("confirmSecurity") !== "confirmed"
  ) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        "Confirm the security-sensitive change before saving.",
      ),
    );
  }
  const actor = await requirePermission(
    parsed.data.isSensitive ? "settings:security" : "settings:manage",
  );
  if (actor.demo)
    redirect(
      resultUrl(returnTo, "error", "Settings are disabled in demo preview."),
    );
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_upsert_setting", {
    p_key: parsed.data.key,
    p_category: parsed.data.category,
    p_value: parsed.data.value,
    p_is_sensitive: parsed.data.isSensitive,
    p_description: parsed.data.description,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error)
    redirect(resultUrl(returnTo, "error", publicErrorMessage(error.message)));
  revalidatePath("/admin/settings");
  redirect(resultUrl(returnTo, "success", "Setting updated and audited."));
}

export async function updateFeatureFlagAction(
  formData: FormData,
): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/settings");
  const parsed = featureFlagUpdateSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid feature flag.",
      ),
    );
  }
  const actor = await requirePermission("settings:security");
  if (actor.demo) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        "Feature flags are disabled in demo preview.",
      ),
    );
  }
  const supabase = await createServerSupabaseClient();
  const { error } = (await supabase?.rpc("admin_update_feature_flag", {
    p_key: parsed.data.key,
    p_enabled: parsed.data.enabled,
    p_reason: parsed.data.reason,
    p_request_metadata: await requestMetadata(),
  })) || { error: new Error("Supabase is not configured.") };
  if (error)
    redirect(resultUrl(returnTo, "error", publicErrorMessage(error.message)));
  revalidatePath("/admin", "layout");
  redirect(resultUrl(returnTo, "success", "Feature flag updated and audited."));
}

export async function createSubAdminAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/users");
  const parsed = createSubAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        parsed.error.issues[0]?.message || "Invalid sub-admin details.",
      ),
    );
  }

  const actor = await requirePermission("users:roles");
  if (actor.demo) {
    redirect(
      resultUrl(
        returnTo,
        "error",
        "Sub-admin creation is disabled in demo admin preview.",
      ),
    );
  }

  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !supabase) {
    redirect(resultUrl(returnTo, "error", "Supabase is not configured."));
  }

  let createdUserId: string | null = null;
  try {
    await enforceMutationRateLimit(actor.id);
    const metadata = await requestMetadata();
    const { displayName, email, momoNumber, password, reason } = parsed.data;

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          momo_number: momoNumber,
          age_confirmed: true,
        },
      });
    if (createError || !created.user) {
      throw new Error(createError?.message || "Unable to create the account.");
    }
    createdUserId = created.user.id;

    let profileReady = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", createdUserId)
        .maybeSingle();
      if (profile?.id) {
        profileReady = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (!profileReady) {
      throw new Error("The account profile was not created in time.");
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        display_name: displayName,
        email: email.toLowerCase(),
        momo_number: momoNumber,
        access_status: "active",
        account_status: "active",
        age_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdUserId);
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabase.rpc("admin_manage_user", {
      p_target_id: createdUserId,
      p_operation: "change_role",
      p_value: "sub_admin",
      p_reason: reason,
      p_request_metadata: metadata,
    });
    if (roleError) throw new Error(roleError.message);
  } catch (error) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }
    redirect(
      resultUrl(
        returnTo,
        "error",
        publicErrorMessage(
          error instanceof Error ? error.message : "Unknown failure",
        ),
      ),
    );
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/users");
  revalidatePath("/admin/referrals");
  redirect(
    resultUrl(
      returnTo,
      "success",
      `Sub-admin created for ${parsed.data.email}. Share the temporary password securely.`,
    ),
  );
}
