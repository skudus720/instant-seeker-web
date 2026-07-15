import "server-only";

import { z } from "zod";
import type { AdminPermission } from "@/lib/admin/permissions";
import { requirePermission } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ADMIN_PAGE_SIZE = 20;

export interface AdminListParams {
  page?: number;
  query?: string;
  status?: string;
  role?: string;
  provider?: string;
  model?: string;
  confidence?: string;
  from?: string;
  to?: string;
  activityFrom?: string;
  activityTo?: string;
  flagged?: boolean;
  rateLimited?: boolean;
  sort?: string;
  direction?: "asc" | "desc";
}

interface AdminListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  newUsersToday: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalAnalyses: number;
  analysesCompletedToday: number;
  pendingAnalyses: number;
  failedAnalyses: number;
  analysisCompletionRate: number;
  averageProcessingMs: number;
  reviewsAwaitingModeration: number;
  winsAwaitingVerification: number;
  verifiedPublicWins: number;
  privateStorageBytes: number;
}

export interface DailyAnalysisPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

export interface DailyCountPoint {
  date: string;
  count: number;
}

export interface ModerationPoint {
  date: string;
  reviews: number;
  wins: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  analysisSeries: DailyAnalysisPoint[];
  userSeries: DailyCountPoint[];
  confidenceBands: Array<{ band: string; count: number }>;
  moderationSeries: ModerationPoint[];
  recentAudit: Array<Record<string, unknown>>;
  recentErrors: Array<Record<string, unknown>>;
}

const numberValue = z.coerce.number().finite().catch(0);
const dashboardSchema = z.object({
  metrics: z.object({
    totalUsers: numberValue,
    newUsersToday: numberValue,
    activeUsers24h: numberValue,
    activeUsers7d: numberValue,
    activeUsers30d: numberValue,
    totalAnalyses: numberValue,
    analysesCompletedToday: numberValue,
    pendingAnalyses: numberValue,
    failedAnalyses: numberValue,
    analysisCompletionRate: numberValue,
    averageProcessingMs: numberValue,
    reviewsAwaitingModeration: numberValue,
    winsAwaitingVerification: numberValue,
    verifiedPublicWins: numberValue,
    privateStorageBytes: numberValue,
  }),
  analysisSeries: z.array(
    z.object({
      date: z.string(),
      total: numberValue,
      completed: numberValue,
      failed: numberValue,
    }),
  ),
  userSeries: z.array(z.object({ date: z.string(), count: numberValue })),
  confidenceBands: z.array(z.object({ band: z.string(), count: numberValue })),
  moderationSeries: z.array(
    z.object({ date: z.string(), reviews: numberValue, wins: numberValue }),
  ),
});

const emptyMetrics: DashboardMetrics = {
  totalUsers: 0,
  newUsersToday: 0,
  activeUsers24h: 0,
  activeUsers7d: 0,
  activeUsers30d: 0,
  totalAnalyses: 0,
  analysesCompletedToday: 0,
  pendingAnalyses: 0,
  failedAnalyses: 0,
  analysisCompletionRate: 0,
  averageProcessingMs: 0,
  reviewsAwaitingModeration: 0,
  winsAwaitingVerification: 0,
  verifiedPublicWins: 0,
  privateStorageBytes: 0,
};

function normalizePage(page?: number) {
  return Number.isInteger(page) && (page || 0) > 0 ? Number(page) : 1;
}

function escapeSearch(value = "") {
  return value
    .trim()
    .replace(/[%_,()]/g, "")
    .slice(0, 120);
}

function countRelation(value: unknown) {
  if (!Array.isArray(value) || !value.length) return 0;
  const count = (value[0] as { count?: unknown }).count;
  return typeof count === "number" ? count : Number(count || 0);
}

function requireAdminDataClient() {
  const client = createAdminSupabaseClient();
  if (!client) {
    throw new Error("The server-side Supabase admin client is not configured.");
  }
  return client;
}

function safeDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

async function readDashboardMetrics(
  permission: AdminPermission,
  from: Date,
  to: Date,
): Promise<DashboardData> {
  const user = await requirePermission(permission);
  if (user.demo) {
    return {
      metrics: emptyMetrics,
      analysisSeries: [],
      userSeries: [],
      confidenceBands: [],
      moderationSeries: [],
      recentAudit: [],
      recentErrors: [],
    };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("admin_dashboard_metrics", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw new Error(`Unable to load admin metrics: ${error.message}`);
  const parsed = dashboardSchema.parse(data);
  const admin = requireAdminDataClient();
  const [auditResult, eventResult] = await Promise.all([
    admin
      .from("admin_audit_logs")
      .select(
        "id, administrator_id, administrator_role, action, target_entity_type, target_entity_id, reason, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("system_events")
      .select(
        "id, severity, source, event_type, message, created_at, resolved_at",
      )
      .in("severity", ["error", "critical"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  return {
    ...parsed,
    recentAudit: auditResult.data || [],
    recentErrors: eventResult.data || [],
  };
}

export function dashboardRange(days: number) {
  const safeDays = [7, 30, 90, 365].includes(days) ? days : 30;
  const to = new Date();
  const from = new Date(to.getTime() - safeDays * 86_400_000);
  return { from, to, days: safeDays };
}

export async function getDashboardData(days = 30) {
  const range = dashboardRange(days);
  return {
    ...(await readDashboardMetrics("dashboard:view", range.from, range.to)),
    range,
  };
}

export async function getReportData(from: Date, to: Date) {
  return readDashboardMetrics("reports:view", from, to);
}

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  accountStatus: string;
  ageConfirmed: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  analysisCount: number;
  reviewCount: number;
  winRecordCount: number;
}

export async function getUsersData(
  params: AdminListParams,
): Promise<AdminListResult<AdminUserRow>> {
  const user = await requirePermission("users:view");
  const page = normalizePage(params.page);
  if (user.demo) return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
  const admin = requireAdminDataClient();
  const fromIndex = (page - 1) * ADMIN_PAGE_SIZE;
  const allowedRoles = new Set(["user", "sub_admin", "admin", "super_admin"]);
  const allowedStatuses = new Set([
    "active",
    "suspended",
    "deletion_pending",
    "anonymized",
    "deleted",
  ]);
  const sortMap: Record<string, string> = {
    name: "display_name",
    created: "created_at",
    activity: "last_active_at",
    role: "role",
  };
  const search = escapeSearch(params.query);
  let constrainedIds: Set<string> | null = null;
  if (params.flagged) {
    const [analyses, reviews, wins] = await Promise.all([
      admin
        .from("analyses")
        .select("user_id")
        .eq("admin_review_status", "flagged")
        .limit(5000),
      admin
        .from("reviews")
        .select("user_id")
        .in("moderation_status", ["rejected", "hidden"])
        .limit(5000),
      admin
        .from("win_records")
        .select("user_id")
        .eq("verification_status", "rejected")
        .limit(5000),
    ]);
    constrainedIds = new Set(
      [
        ...(analyses.data || []),
        ...(reviews.data || []),
        ...(wins.data || []),
      ].map((row) => String(row.user_id)),
    );
  }
  if (params.rateLimited) {
    const { data: events } = await admin
      .from("rate_limit_events")
      .select("user_id")
      .eq("blocked", true)
      .not("user_id", "is", null)
      .limit(5000);
    const rateLimitedIds = new Set(
      (events || []).map((row) => String(row.user_id)),
    );
    constrainedIds = constrainedIds
      ? new Set([...constrainedIds].filter((id) => rateLimitedIds.has(id)))
      : rateLimitedIds;
  }
  if (constrainedIds && !constrainedIds.size) {
    return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
  }
  let query = admin
    .from("profiles")
    .select(
      "id, display_name, email, avatar_url, role, account_status, age_confirmed_at, created_at, last_active_at, analyses(count), reviews(count), win_records(count)",
      { count: "exact" },
    );
  if (search)
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (params.role && allowedRoles.has(params.role))
    query = query.eq("role", params.role);
  if (params.status && allowedStatuses.has(params.status)) {
    query = query.eq("account_status", params.status);
  }
  const fromDate = safeDate(params.from);
  const toDate = safeDate(params.to, true);
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", toDate);
  const activityFrom = safeDate(params.activityFrom);
  const activityTo = safeDate(params.activityTo, true);
  if (activityFrom) query = query.gte("last_active_at", activityFrom);
  if (activityTo) query = query.lte("last_active_at", activityTo);
  if (constrainedIds) query = query.in("id", [...constrainedIds]);
  const { data, count, error } = await query
    .order(sortMap[params.sort || ""] || "created_at", {
      ascending: params.direction === "asc",
    })
    .range(fromIndex, fromIndex + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`Unable to load users: ${error.message}`);
  return {
    rows: (data || []).map((row) => ({
      id: String(row.id),
      displayName: String(row.display_name || "Member"),
      email: String(row.email || "Unavailable"),
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      role: String(row.role || "user"),
      accountStatus: String(row.account_status || "active"),
      ageConfirmed: Boolean(row.age_confirmed_at),
      createdAt: String(row.created_at),
      lastActiveAt:
        typeof row.last_active_at === "string" ? row.last_active_at : null,
      analysisCount: countRelation(row.analyses),
      reviewCount: countRelation(row.reviews),
      winRecordCount: countRelation(row.win_records),
    })),
    total: count || 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export interface AdminAnalysisRow {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
  status: string;
  provider: string;
  model: string | null;
  matchCount: number;
  confidence: string | null;
  durationMs: number | null;
  errorCode: string | null;
  reviewStatus: string;
}

export async function getAnalysesData(
  params: AdminListParams,
): Promise<AdminListResult<AdminAnalysisRow>> {
  const user = await requirePermission("analyses:view");
  const page = normalizePage(params.page);
  if (user.demo) return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
  const admin = requireAdminDataClient();
  const fromIndex = (page - 1) * ADMIN_PAGE_SIZE;
  const allowedStatuses = new Set([
    "pending",
    "processing",
    "completed",
    "failed",
  ]);
  const allowedConfidence = new Set(["low", "medium", "high"]);
  const search = escapeSearch(params.query);
  let matchingUserIds: string[] | null = null;
  if (search && !z.string().uuid().safeParse(search).success) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(100);
    matchingUserIds = (data || []).map((profile) => String(profile.id));
    if (!matchingUserIds.length) {
      return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
    }
  }
  let query = admin
    .from("analyses")
    .select(
      "id, user_id, created_at, status, provider, model_identifier, extracted_matches, overall_confidence_band, processing_duration_ms, error_code, admin_review_status, profiles!analyses_user_id_fkey(display_name)",
      { count: "exact" },
    );
  if (search && z.string().uuid().safeParse(search).success)
    query = query.eq("id", search);
  if (matchingUserIds) query = query.in("user_id", matchingUserIds);
  if (params.status === "flagged")
    query = query.eq("admin_review_status", "flagged");
  else if (params.status && allowedStatuses.has(params.status))
    query = query.eq("status", params.status);
  if (params.provider)
    query = query.eq("provider", escapeSearch(params.provider));
  if (params.model)
    query = query.eq("model_identifier", escapeSearch(params.model));
  if (params.confidence && allowedConfidence.has(params.confidence)) {
    query = query.eq("overall_confidence_band", params.confidence);
  }
  const fromDate = safeDate(params.from);
  const toDate = safeDate(params.to, true);
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", toDate);
  const { data, count, error } = await query
    .order(
      params.sort === "duration" ? "processing_duration_ms" : "created_at",
      {
        ascending: params.direction === "asc",
      },
    )
    .range(fromIndex, fromIndex + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`Unable to load analyses: ${error.message}`);
  return {
    rows: (data || []).map((row) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      return {
        id: String(row.id),
        userId: String(row.user_id),
        userName: String(profile?.display_name || "Member"),
        createdAt: String(row.created_at),
        status: String(row.status),
        provider: String(row.provider || "unknown"),
        model:
          typeof row.model_identifier === "string"
            ? row.model_identifier
            : null,
        matchCount: Array.isArray(row.extracted_matches)
          ? row.extracted_matches.length
          : 0,
        confidence:
          typeof row.overall_confidence_band === "string"
            ? row.overall_confidence_band
            : null,
        durationMs:
          typeof row.processing_duration_ms === "number"
            ? row.processing_duration_ms
            : null,
        errorCode: typeof row.error_code === "string" ? row.error_code : null,
        reviewStatus: String(row.admin_review_status || "unreviewed"),
      };
    }),
    total: count || 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export interface AdminWinRow {
  id: string;
  userId: string;
  userName: string;
  amountMinor: number;
  currency: string;
  status: string;
  consent: boolean;
  publicName: string | null;
  hasEvidence: boolean;
  createdAt: string;
  wonAt: string;
  moderatorId: string | null;
}

export async function getWinRecordsData(
  params: AdminListParams,
): Promise<AdminListResult<AdminWinRow>> {
  const user = await requirePermission("moderation:view");
  const page = normalizePage(params.page);
  if (user.demo) return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
  const admin = requireAdminDataClient();
  const fromIndex = (page - 1) * ADMIN_PAGE_SIZE;
  const statuses = new Set([
    "pending",
    "under_review",
    "verified",
    "rejected",
    "published",
    "unpublished",
  ]);
  let query = admin
    .from("win_records")
    .select(
      "id, user_id, amount_minor, currency, verification_status, consent_to_publish, privacy_safe_public_name, ticket_image_path, created_at, won_at, moderator_id, profiles!win_records_user_id_fkey(display_name)",
      { count: "exact" },
    );
  if (params.status && statuses.has(params.status))
    query = query.eq("verification_status", params.status);
  const search = escapeSearch(params.query);
  if (search && z.string().uuid().safeParse(search).success)
    query = query.eq("id", search);
  const fromDate = safeDate(params.from);
  const toDate = safeDate(params.to, true);
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", toDate);
  const { data, count, error } = await query
    .order("created_at", { ascending: params.direction === "asc" })
    .range(fromIndex, fromIndex + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`Unable to load win records: ${error.message}`);
  return {
    rows: (data || []).map((row) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      return {
        id: String(row.id),
        userId: String(row.user_id),
        userName: String(profile?.display_name || "Member"),
        amountMinor: Number(row.amount_minor || 0),
        currency: String(row.currency || "GHS"),
        status: String(row.verification_status),
        consent: Boolean(row.consent_to_publish),
        publicName:
          typeof row.privacy_safe_public_name === "string"
            ? row.privacy_safe_public_name
            : null,
        hasEvidence: Boolean(row.ticket_image_path),
        createdAt: String(row.created_at),
        wonAt: String(row.won_at),
        moderatorId:
          typeof row.moderator_id === "string" ? row.moderator_id : null,
      };
    }),
    total: count || 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export interface AdminReviewRow {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  originalBody: string;
  redactedBody: string | null;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  moderatorId: string | null;
  moderationReason: string | null;
}

export async function getReviewsData(
  params: AdminListParams,
): Promise<AdminListResult<AdminReviewRow>> {
  const user = await requirePermission("moderation:view");
  const page = normalizePage(params.page);
  if (user.demo) return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
  const admin = requireAdminDataClient();
  const fromIndex = (page - 1) * ADMIN_PAGE_SIZE;
  const statuses = new Set(["pending", "approved", "rejected", "hidden"]);
  let query = admin
    .from("reviews")
    .select(
      "id, user_id, rating, original_body, redacted_body, moderation_status, created_at, published_at, moderator_id, moderation_reason, profiles!reviews_user_id_fkey(display_name)",
      { count: "exact" },
    );
  if (params.status && statuses.has(params.status))
    query = query.eq("moderation_status", params.status);
  const search = escapeSearch(params.query);
  if (search) query = query.ilike("original_body", `%${search}%`);
  const fromDate = safeDate(params.from);
  const toDate = safeDate(params.to, true);
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", toDate);
  const { data, count, error } = await query
    .order("created_at", { ascending: params.direction === "asc" })
    .range(fromIndex, fromIndex + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`Unable to load reviews: ${error.message}`);
  return {
    rows: (data || []).map((row) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      return {
        id: String(row.id),
        userId: String(row.user_id),
        userName: String(profile?.display_name || "Member"),
        rating: Number(row.rating),
        originalBody: String(row.original_body || ""),
        redactedBody:
          typeof row.redacted_body === "string" ? row.redacted_body : null,
        status: String(row.moderation_status),
        createdAt: String(row.created_at),
        publishedAt:
          typeof row.published_at === "string" ? row.published_at : null,
        moderatorId:
          typeof row.moderator_id === "string" ? row.moderator_id : null,
        moderationReason:
          typeof row.moderation_reason === "string"
            ? row.moderation_reason
            : null,
      };
    }),
    total: count || 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function getContentVersions() {
  const user = await requirePermission("content:view");
  if (user.demo)
    return { versions: [], metrics: {} as Record<string, unknown> };
  const admin = requireAdminDataClient();
  const supabase = await createServerSupabaseClient();
  const [versions, metrics] = await Promise.all([
    admin
      .from("content_versions")
      .select(
        "id, content_key, version_number, content, status, change_reason, created_by, published_by, published_at, created_at",
      )
      .order("content_key")
      .order("version_number", { ascending: false }),
    supabase?.rpc("admin_public_metric_snapshot") ||
      Promise.resolve({ data: null, error: null }),
  ]);
  if (versions.error)
    throw new Error(`Unable to load content: ${versions.error.message}`);
  return {
    versions: versions.data || [],
    metrics: (metrics.data || {}) as Record<string, unknown>,
  };
}

export async function getAiConfigurations() {
  const user = await requirePermission("ai_config:view");
  if (user.demo) return [];
  const admin = requireAdminDataClient();
  const { data, error } = await admin
    .from("ai_config_versions")
    .select("*, analyses(count)")
    .order("version_number", { ascending: false });
  if (error)
    throw new Error(`Unable to load AI configurations: ${error.message}`);
  return data || [];
}

export async function getAuditData(
  params: AdminListParams & {
    action?: string;
    entity?: string;
    administrator?: string;
  },
) {
  const user = await requirePermission("audit:view");
  const page = normalizePage(params.page);
  if (user.demo) return { rows: [], total: 0, page, pageSize: ADMIN_PAGE_SIZE };
  const admin = requireAdminDataClient();
  const fromIndex = (page - 1) * ADMIN_PAGE_SIZE;
  let query = admin
    .from("admin_audit_logs")
    .select(
      "id, administrator_id, administrator_role, action, target_entity_type, target_entity_id, previous_value_redacted, new_value_redacted, reason, request_metadata, ip_address, user_agent, created_at",
      { count: "exact" },
    );
  if (user.role !== "super_admin")
    query = query.eq("administrator_id", user.id);
  if (params.action)
    query = query.ilike("action", `%${escapeSearch(params.action)}%`);
  if (params.entity)
    query = query.eq("target_entity_type", escapeSearch(params.entity));
  if (params.administrator && user.role === "super_admin") {
    const administratorId = z.string().uuid().safeParse(params.administrator);
    if (administratorId.success) {
      query = query.eq("administrator_id", administratorId.data);
    }
  }
  const fromDate = safeDate(params.from);
  const toDate = safeDate(params.to, true);
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", toDate);
  const { data, count, error } = await query
    .order("created_at", { ascending: params.direction === "asc" })
    .range(fromIndex, fromIndex + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`Unable to load audit events: ${error.message}`);
  const rows = (data || []).map((row) =>
    user.role === "super_admin"
      ? row
      : { ...row, ip_address: null, user_agent: null, request_metadata: {} },
  );
  return { rows, total: count || 0, page, pageSize: ADMIN_PAGE_SIZE };
}

export async function getSettingsData() {
  const user = await requirePermission("settings:view");
  if (user.demo) return { settings: [], flags: [] };
  const admin = requireAdminDataClient();
  const [settings, flags] = await Promise.all([
    admin.from("site_settings").select("*").order("category").order("key"),
    admin.from("feature_flags").select("*").order("key"),
  ]);
  if (settings.error)
    throw new Error(`Unable to load settings: ${settings.error.message}`);
  return {
    settings: (settings.data || []).filter(
      (setting) => user.role === "super_admin" || !setting.is_sensitive,
    ),
    flags: user.role === "super_admin" ? flags.data || [] : [],
  };
}

export async function getSystemHealthData() {
  const user = await requirePermission("system:view");
  const version =
    process.env.APP_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
    process.env.GITHUB_SHA?.slice(0, 12) ||
    "development";
  if (user.demo) {
    return {
      version,
      checks: [],
      events: [],
      failedJobs: [],
      staleJobs: [],
      rateLimitCount: 0,
      averageRequestMs: 0,
    };
  }
  const admin = requireAdminDataClient();
  const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [
    database,
    profiles,
    buckets,
    events,
    failedJobs,
    staleJobs,
    rateLimits,
    durations,
  ] = await Promise.all([
    admin.from("site_settings").select("key", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.storage.listBuckets(),
    admin
      .from("system_events")
      .select(
        "id, severity, source, event_type, message, details_redacted, created_at, resolved_at",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("analyses")
      .select(
        "id, user_id, provider, error_code, error_message_redacted, created_at",
      )
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("analyses")
      .select("id, user_id, provider, processing_started_at, created_at")
      .eq("status", "processing")
      .lt("processing_started_at", staleBefore)
      .limit(20),
    admin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo)
      .eq("blocked", true),
    admin
      .from("system_events")
      .select("request_duration_ms")
      .gte("created_at", dayAgo)
      .not("request_duration_ms", "is", null)
      .limit(1000),
  ]);
  const durationRows = durations.data || [];
  const averageRequestMs = durationRows.length
    ? Math.round(
        durationRows.reduce(
          (sum, row) => sum + Number(row.request_duration_ms || 0),
          0,
        ) / durationRows.length,
      )
    : 0;
  const bucketNames = new Set(
    (buckets.data || []).map((bucket) => bucket.name),
  );
  return {
    version,
    checks: [
      {
        label: "Database connectivity",
        status: database.error ? "error" : "healthy",
        detail: database.error
          ? "Database query failed"
          : "Operational query succeeded",
      },
      {
        label: "Supabase Auth",
        status: profiles.error ? "error" : "healthy",
        detail: profiles.error
          ? "Profile access failed"
          : "Profile store reachable",
      },
      {
        label: "Private storage",
        status:
          bucketNames.has("analysis-screenshots") &&
          bucketNames.has("win-records")
            ? "healthy"
            : "warning",
        detail: buckets.error
          ? "Storage status unavailable"
          : "Private buckets checked",
      },
      {
        label: "AI provider",
        status: process.env.ANALYSIS_PROVIDER_API_KEY ? "healthy" : "warning",
        detail: process.env.ANALYSIS_PROVIDER_API_KEY
          ? "Provider credential is configured"
          : "Deterministic demonstration provider is active",
      },
      {
        label: "Realtime",
        status: "warning",
        detail: "No persistent server-side Realtime probe is active",
      },
    ],
    events: events.data || [],
    failedJobs: failedJobs.data || [],
    staleJobs: staleJobs.data || [],
    rateLimitCount: rateLimits.count || 0,
    averageRequestMs,
  };
}

export async function getUserDetails(userId: string) {
  const current = await requirePermission("users:view");
  if (current.demo) return null;
  const parsedId = z.string().uuid().safeParse(userId);
  if (!parsedId.success) return null;
  const admin = requireAdminDataClient();
  const [profile, analyses, reviews, wins, notes, audit, security, moderation] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", parsedId.data).maybeSingle(),
      admin
        .from("analyses")
        .select(
          "id, status, provider, overall_confidence_band, admin_review_status, created_at",
        )
        .eq("user_id", parsedId.data)
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("reviews")
        .select("id, rating, moderation_status, original_body, created_at")
        .eq("user_id", parsedId.data)
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("win_records")
        .select(
          "id, amount_minor, currency, verification_status, consent_to_publish, created_at",
        )
        .eq("user_id", parsedId.data)
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("admin_notes")
        .select("id, body, created_by, created_at")
        .eq("target_entity_type", "user")
        .eq("target_entity_id", parsedId.data)
        .order("created_at", { ascending: false }),
      admin
        .from("admin_audit_logs")
        .select("id, administrator_id, action, reason, created_at")
        .eq("target_entity_type", "user")
        .eq("target_entity_id", parsedId.data)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("rate_limit_events")
        .select("id, scope, blocked, metadata_redacted, created_at")
        .eq("user_id", parsedId.data)
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("moderation_actions")
        .select(
          "id, entity_type, entity_id, action, previous_status, new_status, reason, moderator_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
  if (profile.error)
    throw new Error(`Unable to load user: ${profile.error.message}`);
  if (!profile.data) return null;
  const userReviewIds = new Set((reviews.data || []).map((row) => row.id));
  const userWinIds = new Set((wins.data || []).map((row) => row.id));
  return {
    profile: profile.data,
    analyses: analyses.data || [],
    reviews: reviews.data || [],
    wins: wins.data || [],
    notes: notes.data || [],
    audit:
      current.role === "super_admin"
        ? audit.data || []
        : (audit.data || []).filter(
            (row) => row.administrator_id === current.id,
          ),
    security: current.role === "super_admin" ? security.data || [] : [],
    moderation: (moderation.data || []).filter(
      (row) =>
        (row.entity_type === "review" && userReviewIds.has(row.entity_id)) ||
        (row.entity_type === "win_record" && userWinIds.has(row.entity_id)),
    ),
  };
}

export async function getAnalysisDetails(analysisId: string) {
  const user = await requirePermission("analyses:view");
  if (user.demo) return null;
  const parsedId = z.string().uuid().safeParse(analysisId);
  if (!parsedId.success) return null;
  const admin = requireAdminDataClient();
  const [analysis, retries, notes, audit] = await Promise.all([
    admin
      .from("analyses")
      .select("*, profiles!analyses_user_id_fkey(display_name, email)")
      .eq("id", parsedId.data)
      .maybeSingle(),
    admin
      .from("analysis_retry_jobs")
      .select(
        "id, requested_by, use_active_configuration, reason, status, started_at, completed_at, error_message_redacted, provider, model_identifier, configuration_version_id, result, original_provider_response, processing_duration_ms, created_at",
      )
      .eq("analysis_id", parsedId.data)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_notes")
      .select("id, body, created_by, created_at")
      .eq("target_entity_type", "analysis")
      .eq("target_entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_audit_logs")
      .select("id, administrator_id, action, reason, created_at")
      .eq("target_entity_type", "analysis")
      .eq("target_entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
  ]);
  if (analysis.error)
    throw new Error(`Unable to load analysis: ${analysis.error.message}`);
  return analysis.data
    ? {
        analysis: analysis.data,
        retries: retries.data || [],
        notes: notes.data || [],
        audit: audit.data || [],
      }
    : null;
}

export async function getWinRecordDetails(recordId: string) {
  const user = await requirePermission("moderation:view");
  if (user.demo) return null;
  const parsedId = z.string().uuid().safeParse(recordId);
  if (!parsedId.success) return null;
  const admin = requireAdminDataClient();
  const [record, moderation, notes, audit] = await Promise.all([
    admin.from("win_records").select("*").eq("id", parsedId.data).maybeSingle(),
    admin
      .from("moderation_actions")
      .select("*")
      .eq("entity_type", "win_record")
      .eq("entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_notes")
      .select("id, body, created_by, created_at")
      .eq("target_entity_type", "win_record")
      .eq("target_entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_audit_logs")
      .select("id, administrator_id, action, reason, created_at")
      .eq("target_entity_type", "win_record")
      .eq("target_entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
  ]);
  if (record.error)
    throw new Error(`Unable to load win record: ${record.error.message}`);
  if (!record.data) return null;
  const [profile, moderator, analysis] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", record.data.user_id)
      .maybeSingle(),
    record.data.moderator_id
      ? admin
          .from("profiles")
          .select("id, display_name, role")
          .eq("id", record.data.moderator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    record.data.linked_analysis_id
      ? admin
          .from("analyses")
          .select("id, status, provider, overall_confidence_band, created_at")
          .eq("id", record.data.linked_analysis_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    record: record.data,
    profile: profile.data,
    moderator: moderator.data,
    analysis: analysis.data,
    moderation: moderation.data || [],
    notes: notes.data || [],
    audit: audit.data || [],
  };
}

export async function getReviewDetails(reviewId: string) {
  const user = await requirePermission("moderation:view");
  if (user.demo) return null;
  const parsedId = z.string().uuid().safeParse(reviewId);
  if (!parsedId.success) return null;
  const admin = requireAdminDataClient();
  const [review, moderation, notes, audit] = await Promise.all([
    admin.from("reviews").select("*").eq("id", parsedId.data).maybeSingle(),
    admin
      .from("moderation_actions")
      .select("*")
      .eq("entity_type", "review")
      .eq("entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_notes")
      .select("id, body, created_by, created_at")
      .eq("target_entity_type", "review")
      .eq("target_entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_audit_logs")
      .select("id, administrator_id, action, reason, created_at")
      .eq("target_entity_type", "review")
      .eq("target_entity_id", parsedId.data)
      .order("created_at", { ascending: false }),
  ]);
  if (review.error)
    throw new Error(`Unable to load review: ${review.error.message}`);
  if (!review.data) return null;
  const [profile, moderator, analysis] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", review.data.user_id)
      .maybeSingle(),
    review.data.moderator_id
      ? admin
          .from("profiles")
          .select("id, display_name, role")
          .eq("id", review.data.moderator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    review.data.related_analysis_id
      ? admin
          .from("analyses")
          .select("id, status, provider, created_at")
          .eq("id", review.data.related_analysis_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    review: review.data,
    profile: profile.data,
    moderator: moderator.data,
    analysis: analysis.data,
    moderation: moderation.data || [],
    notes: notes.data || [],
    audit: audit.data || [],
  };
}
