import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const exportSchema = z.object({
  type: z.enum([
    "user-growth",
    "analysis-volume",
    "provider-performance",
    "moderation",
    "verified-wins",
    "reviews",
    "suspensions",
    "storage",
  ]),
  from: z.iso.date(),
  to: z.iso.date(),
  reason: z.string().trim().min(5).max(1000),
});

function csvCell(value: unknown) {
  const text =
    value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return 'status\n"No records in selected UTC range"\n';
  const columns = Object.keys(rows[0]);
  return `${columns.map(csvCell).join(",")}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

export async function GET(request: NextRequest) {
  const actor = await requirePermission("reports:export");
  if (actor.demo)
    return NextResponse.json(
      { error: "Exports are disabled in demo preview." },
      { status: 409 },
    );
  const parsed = exportSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid report request." },
      { status: 400 },
    );
  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T23:59:59.999Z`);
  if (from > to || to.getTime() - from.getTime() > 366 * 86_400_000) {
    return NextResponse.json(
      { error: "Report range must be 366 days or fewer." },
      { status: 400 },
    );
  }
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !supabase)
    return NextResponse.json(
      { error: "Reporting is not configured." },
      { status: 503 },
    );
  const type = parsed.data.type;
  let rows: Array<Record<string, unknown>> = [];
  let error: { message: string } | null = null;
  if (type === "user-growth") {
    const result = await admin
      .from("profiles")
      .select("created_at, role, account_status, age_confirmed_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000);
    rows = (result.data || []).map((row) => ({
      signup_date_utc: String(row.created_at).slice(0, 10),
      role: row.role,
      account_status: row.account_status,
      age_confirmed: Boolean(row.age_confirmed_at),
    }));
    error = result.error;
  } else if (type === "analysis-volume" || type === "provider-performance") {
    const result = await admin
      .from("analyses")
      .select(
        "created_at, status, provider, model_identifier, processing_duration_ms, overall_confidence_band, admin_review_status",
      )
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000);
    rows = (result.data || []).map((row) => ({
      date_utc: String(row.created_at).slice(0, 10),
      status: row.status,
      provider: row.provider,
      model: row.model_identifier,
      processing_duration_ms: row.processing_duration_ms,
      confidence_band: row.overall_confidence_band,
      review_status: row.admin_review_status,
    }));
    error = result.error;
  } else if (type === "moderation") {
    const result = await admin
      .from("moderation_actions")
      .select("created_at, entity_type, action, previous_status, new_status")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000);
    rows = (result.data || []).map((row) => ({
      date_utc: String(row.created_at).slice(0, 10),
      entity_type: row.entity_type,
      action: row.action,
      previous_status: row.previous_status,
      new_status: row.new_status,
    }));
    error = result.error;
  } else if (type === "verified-wins") {
    const result = await admin
      .from("win_records")
      .select(
        "created_at, verification_status, amount_minor, currency, verified_at, published_at, consent_to_publish, is_sample",
      )
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000);
    rows = (result.data || []).map((row) => ({
      date_utc: String(row.created_at).slice(0, 10),
      status: row.verification_status,
      amount_minor: row.amount_minor,
      currency: row.currency,
      is_verified: Boolean(row.verified_at),
      is_published: Boolean(row.published_at),
      consent_recorded: Boolean(row.consent_to_publish),
      demo_record: Boolean(row.is_sample),
    }));
    error = result.error;
  } else if (type === "reviews") {
    const result = await admin
      .from("reviews")
      .select("created_at, rating, moderation_status, published_at, is_sample")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000);
    rows = (result.data || []).map((row) => ({
      date_utc: String(row.created_at).slice(0, 10),
      rating: row.rating,
      moderation_status: row.moderation_status,
      published: Boolean(row.published_at),
      demo_record: Boolean(row.is_sample),
    }));
    error = result.error;
  } else if (type === "suspensions") {
    const result = await admin
      .from("admin_audit_logs")
      .select("created_at, action, administrator_role, reason")
      .in("action", ["user.suspend", "user.suspend_until", "user.reactivate"])
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000);
    rows = (result.data || []).map((row) => ({
      date_utc: String(row.created_at).slice(0, 10),
      action: row.action,
      administrator_role: row.administrator_role,
      reason: row.reason,
    }));
    error = result.error;
  } else {
    const result = await supabase.rpc("admin_storage_growth", {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });
    rows = (result.data || []).map((row: Record<string, unknown>) => ({
      date_utc: row.date_utc,
      bucket: row.bucket,
      file_count: row.file_count,
      size_bytes: row.size_bytes,
    }));
    error = result.error;
  }
  if (error)
    return NextResponse.json(
      { error: "Unable to generate report." },
      { status: 500 },
    );
  const audit = await supabase.rpc("admin_record_export", {
    p_report_type: type,
    p_reason: parsed.data.reason,
    p_request_metadata: {
      user_agent: request.headers.get("user-agent")?.slice(0, 500),
      range_utc: { from: parsed.data.from, to: parsed.data.to },
      row_count: rows.length,
    },
  });
  if (audit.error)
    return NextResponse.json(
      { error: "The export could not be audited." },
      { status: 500 },
    );
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="instant-seeker-${type}-${parsed.data.from}-${parsed.data.to}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Report-Timezone": "UTC",
      "X-Export-Truncated": rows.length === 10000 ? "true" : "false",
    },
  });
}
