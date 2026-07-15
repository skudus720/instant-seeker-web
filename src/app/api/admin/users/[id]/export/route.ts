import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requirePermission("users:manage");
  if (actor.demo) {
    return NextResponse.json(
      { error: "Exports are disabled in demo preview." },
      { status: 409 },
    );
  }
  const { id } = await params;
  const parsed = z
    .object({
      id: z.string().uuid(),
      reason: z.string().trim().min(5).max(1000),
    })
    .safeParse({ id, reason: request.nextUrl.searchParams.get("reason") });
  if (!parsed.success)
    return NextResponse.json(
      { error: "A valid user and export reason are required." },
      { status: 400 },
    );
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !supabase)
    return NextResponse.json(
      { error: "Export service is not configured." },
      { status: 503 },
    );
  const userId = parsed.data.id;
  const [profile, analyses, reviews, wins, subscriptions, payments, privacy] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, email, display_name, avatar_url, role, account_status, age_confirmed_at, accepted_terms_at, momo_number, created_at, updated_at, last_active_at, suspended_until, deleted_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("analyses")
        .select(
          "id, extracted_matches, result, provider, status, overall_confidence_band, admin_review_status, created_at, processing_duration_ms",
        )
        .eq("user_id", userId)
        .order("created_at"),
      admin
        .from("reviews")
        .select(
          "id, rating, original_body, redacted_body, moderation_status, published_at, created_at",
        )
        .eq("user_id", userId)
        .order("created_at"),
      admin
        .from("win_records")
        .select(
          "id, amount_minor, currency, verification_status, consent_to_publish, privacy_safe_public_name, verified_at, published_at, won_at, created_at",
        )
        .eq("user_id", userId)
        .order("created_at"),
      admin
        .from("ai_subscriptions")
        .select(
          "id, plan_code, amount_minor, currency, status, starts_at, expires_at, created_at",
        )
        .eq("user_id", userId)
        .order("created_at"),
      admin
        .from("signup_payments")
        .select("id, amount_minor, currency, status, paid_at, created_at")
        .eq("user_id", userId)
        .order("created_at"),
      admin
        .from("privacy_requests")
        .select("id, request_type, status, reason, completed_at, created_at")
        .eq("user_id", userId)
        .order("created_at"),
    ]);
  if (profile.error || !profile.data)
    return NextResponse.json(
      { error: "User record not found." },
      { status: 404 },
    );
  const audit = await supabase.rpc("admin_record_export", {
    p_report_type: `privacy-user-${userId}`,
    p_reason: parsed.data.reason,
    p_request_metadata: {
      user_agent: request.headers.get("user-agent")?.slice(0, 500),
      export_scope: "user_privacy_data",
    },
  });
  if (audit.error)
    return NextResponse.json(
      { error: "The export could not be audited." },
      { status: 500 },
    );
  const payload = {
    export_version: 1,
    generated_at: new Date().toISOString(),
    subject_user_id: userId,
    profile: profile.data,
    analyses: analyses.data || [],
    reviews: reviews.data || [],
    win_records: wins.data || [],
    subscriptions: subscriptions.data || [],
    signup_payments: payments.data || [],
    privacy_requests: privacy.data || [],
    excluded_data: [
      "passwords and password hashes",
      "access and refresh tokens",
      "provider secrets",
      "private storage paths and signed URLs",
      "other users' data",
      "internal administrator notes",
    ],
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="instant-seeker-user-${userId}.json"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
