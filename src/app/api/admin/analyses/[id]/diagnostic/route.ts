import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const sensitiveKey =
  /email|phone|momo|account|ticket|token|secret|authorization|cookie|private.*path|user_id/i;
const emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const phonePattern = /(?:\+?233|0)[235][0-9]{8}/g;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : sanitize(child),
      ]),
    );
  }
  if (typeof value === "string") {
    return value
      .replace(emailPattern, "[REDACTED_EMAIL]")
      .replace(phonePattern, "[REDACTED_PHONE]");
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requirePermission("analyses:manage");
  if (actor.demo)
    return NextResponse.json(
      { error: "Exports are disabled in demo preview." },
      { status: 409 },
    );
  const { id } = await params;
  const parsed = z
    .object({
      id: z.string().uuid(),
      reason: z.string().trim().min(5).max(1000),
    })
    .safeParse({ id, reason: request.nextUrl.searchParams.get("reason") });
  if (!parsed.success)
    return NextResponse.json(
      { error: "A valid analysis and export reason are required." },
      { status: 400 },
    );
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !supabase)
    return NextResponse.json(
      { error: "Diagnostic export is not configured." },
      { status: 503 },
    );
  const { data, error } = await admin
    .from("analyses")
    .select(
      "id, extracted_matches, result, provider, status, created_at, model_identifier, configuration_version_id, overall_confidence_band, processing_started_at, processing_completed_at, processing_duration_ms, admin_review_status, upload_metadata, original_provider_response, admin_correction, correction_reason, corrected_at, error_code, error_message_redacted",
    )
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Analysis record not found." },
      { status: 404 },
    );
  const audit = await supabase.rpc("admin_record_export", {
    p_report_type: `analysis-diagnostic-${parsed.data.id}`,
    p_reason: parsed.data.reason,
    p_request_metadata: {
      user_agent: request.headers.get("user-agent")?.slice(0, 500),
      export_scope: "sanitized_analysis_diagnostic",
    },
  });
  if (audit.error)
    return NextResponse.json(
      { error: "The diagnostic export could not be audited." },
      { status: 500 },
    );
  const payload = sanitize({
    export_version: 1,
    generated_at: new Date().toISOString(),
    diagnostic: data,
    sanitization: {
      private_image_paths_removed: true,
      account_identifiers_removed: true,
      authorization_data_removed: true,
      provider_credentials_never_loaded: true,
    },
  });
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="instant-seeker-analysis-${parsed.data.id}-diagnostic.json"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
