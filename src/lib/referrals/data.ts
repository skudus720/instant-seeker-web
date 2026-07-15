import "server-only";

import { z } from "zod";
import { appConfig, siteUrl } from "@/lib/config";
import { requirePermission, requireSubAdmin } from "@/lib/auth";
import type {
  ReferralActivityRow,
  ReferralCurrencySummary,
  ReferralPackageAnalytics,
  ReferralPartnerRollup,
  ReferralPaymentStatusBreakdown,
  ReferralPayoutRow,
} from "@/lib/referrals/types";
import {
  referralAdminListQuerySchema,
  referralListQuerySchema,
} from "@/lib/referrals/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const REFERRAL_PAGE_SIZE = 20;

const overviewSchema = z.object({
  totalSubAdmins: z.coerce.number().int().catch(0),
  activeSubAdmins: z.coerce.number().int().catch(0),
  suspendedSubAdmins: z.coerce.number().int().catch(0),
  totalClicks: z.coerce.number().int().catch(0),
  uniqueVisitors: z.coerce.number().int().catch(0),
  referredRegistrations: z.coerce.number().int().catch(0),
  payingCustomers: z.coerce.number().int().catch(0),
  referredPayments: z.coerce.number().int().catch(0),
  financials: z.record(z.string(), z.record(z.string(), z.unknown())).catch({}),
});

function requireReferralDataClient() {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Referral persistence is not configured.");
  return client;
}

function minorString(value: unknown) {
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  return "0";
}

function countValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeFinancials(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, ReferralCurrencySummary>;
  }
  return Object.fromEntries(
    Object.entries(value).map(([currency, raw]) => {
      const row =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      return [
        currency,
        {
          referredRevenueMinor: minorString(row.referred_revenue_minor),
          referredProfitMinor: minorString(row.referred_profit_minor),
          commissionEarnedMinor: minorString(row.commission_earned_minor),
          superAdminShareMinor: minorString(row.super_admin_share_minor),
          pendingCommissionMinor: minorString(row.pending_commission_minor),
          availableBalanceMinor: minorString(row.available_balance_minor),
          totalPaidMinor: minorString(row.total_paid_minor),
        },
      ];
    }),
  );
}

function normalizeRollup(row: Record<string, unknown>): ReferralPartnerRollup {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    displayName: String(row.display_name || "Sub-admin"),
    email: String(row.email || ""),
    accountStatus: String(row.account_status || "active"),
    suspendedUntil:
      typeof row.suspended_until === "string" ? row.suspended_until : null,
    referralOperational: row.referral_operational === true,
    referralCode: String(row.referral_code || ""),
    referralEnabled: row.referral_enabled === true,
    commissionRateBasisPoints: countValue(row.commission_rate_basis_points),
    createdAt: String(row.created_at),
    totalClicks: countValue(row.total_clicks),
    uniqueVisitors: countValue(row.unique_visitors),
    referredRegistrations: countValue(row.referred_registrations),
    payingCustomers: countValue(row.paying_customers),
    successfulTransactions: countValue(row.successful_transactions),
    lastReferralActivityAt:
      typeof row.last_referral_activity_at === "string"
        ? row.last_referral_activity_at
        : null,
    financials: normalizeFinancials(row.financials),
  };
}

function safeSearch(value: string) {
  return value.replace(/[%_,()]/g, "").slice(0, 120);
}

function safeDate(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function maskEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  if (!local || !domain) return "Private customer";
  return `${local.slice(0, 2)}${"*".repeat(Math.min(5, Math.max(2, local.length - 2)))}@${domain}`;
}

function privacySafeName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Private customer";
  if (parts.length === 1) return parts[0].slice(0, 12);
  return `${parts[0].slice(0, 12)} ${parts.at(-1)?.slice(0, 1).toUpperCase()}.`;
}

async function activityRows(
  rows: Array<Record<string, unknown>>,
  showFullCustomer: boolean,
) {
  const admin = requireReferralDataClient();
  const customerIds = Array.from(
    new Set(
      rows
        .map((row) => row.customer_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  );
  const profileMap = new Map<string, { display_name: string; email: string }>();
  if (customerIds.length) {
    const { data } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", customerIds);
    (data || []).forEach((profile) =>
      profileMap.set(String(profile.id), {
        display_name: String(profile.display_name || "Customer"),
        email: String(profile.email || ""),
      }),
    );
  }

  return rows.map((row): ReferralActivityRow => {
    const customer = profileMap.get(String(row.customer_id));
    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      customerDisplayName: showFullCustomer
        ? customer?.display_name || "Private customer"
        : privacySafeName(customer?.display_name || ""),
      customerEmail: showFullCustomer
        ? customer?.email || "Not available"
        : maskEmail(customer?.email || ""),
      paymentReference: String(row.payment_reference || "Manual entry"),
      sourcePaymentType: String(row.source_payment_type),
      productCode:
        typeof row.product_code === "string" ? row.product_code : null,
      currency: String(row.currency),
      grossAmountMinor: minorString(row.gross_amount_minor),
      netProfitMinor: minorString(row.net_profit_minor),
      subAdminAmountMinor: minorString(row.sub_admin_amount_minor),
      entryType: String(row.entry_type),
      status: String(row.status),
      refundAmountMinor: minorString(row.refund_amount_minor),
    };
  });
}

function payoutRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row): ReferralPayoutRow => ({
    id: String(row.id),
    payoutDate: String(row.payout_date),
    amountMinor: minorString(row.amount_minor),
    currency: String(row.currency),
    paymentMethod: String(row.payment_method),
    externalReference: String(row.external_reference),
    status: String(row.status),
    notes: typeof row.notes === "string" ? row.notes : null,
  }));
}

function normalizePartnerAnalytics(value: unknown): {
  recentTransactions30Days: number;
  packageAnalytics: ReferralPackageAnalytics[];
  paymentStatus: ReferralPaymentStatusBreakdown;
} {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const packages = Array.isArray(source.package_analytics)
    ? source.package_analytics
    : [];
  const paymentStatus =
    source.payment_status &&
    typeof source.payment_status === "object" &&
    !Array.isArray(source.payment_status)
      ? (source.payment_status as Record<string, unknown>)
      : {};
  return {
    recentTransactions30Days: countValue(source.recent_transactions_30_days),
    packageAnalytics: packages.flatMap((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        return [];
      const row = value as Record<string, unknown>;
      const productCode = String(row.product_code || "")
        .trim()
        .toLowerCase();
      const currency = String(row.currency || "")
        .trim()
        .toUpperCase();
      if (!productCode || !/^[A-Z]{3}$/.test(currency)) return [];
      return [
        {
          productCode,
          currency,
          count: countValue(row.count),
          revenueMinor: minorString(row.revenue_minor),
        },
      ];
    }),
    paymentStatus: {
      failed: countValue(paymentStatus.failed),
      completed: countValue(paymentStatus.completed),
      pending: countValue(paymentStatus.pending),
    },
  };
}

async function refreshAvailability() {
  await requireReferralDataClient().rpc(
    "refresh_referral_commission_availability",
  );
}

export async function getReferralPartnerDashboard(input: unknown) {
  const user = await requireSubAdmin();
  const query = referralListQuerySchema.parse(input);
  if (user.demo) {
    const referralCode = "SUBADMINTEST";
    return {
      preview: true,
      user,
      rollup: {
        id: "00000000-0000-4000-8000-000000000101",
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        accountStatus: "active",
        suspendedUntil: null,
        referralOperational: true,
        referralCode,
        referralEnabled: false,
        commissionRateBasisPoints: 7000,
        createdAt: "2026-01-01T00:00:00.000Z",
        totalClicks: 0,
        uniqueVisitors: 0,
        referredRegistrations: 0,
        payingCustomers: 0,
        successfulTransactions: 0,
        lastReferralActivityAt: null,
        financials: {},
      } satisfies ReferralPartnerRollup,
      referralUrl: `${siteUrl}/r/${referralCode}`,
      activity: [] as ReferralActivityRow[],
      activityTotal: 0,
      page: query.page,
      pageSize: REFERRAL_PAGE_SIZE,
      payouts: [] as ReferralPayoutRow[],
      recentTransactions30Days: 0,
      packageAnalytics: [] as ReferralPackageAnalytics[],
      paymentStatus: { failed: 0, completed: 0, pending: 0 },
      query,
    };
  }
  const admin = requireReferralDataClient();
  await refreshAvailability();
  const { data: rollupRow, error: rollupError } = await admin
    .from("referral_sub_admin_rollup")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (rollupError || !rollupRow) {
    throw new Error("Referral profile could not be loaded.");
  }
  const rollup = normalizeRollup(rollupRow);
  const start = (query.page - 1) * REFERRAL_PAGE_SIZE;
  const search = safeSearch(query.q);
  let ledgerQuery = admin
    .from("referral_commission_ledger")
    .select(
      "id, customer_id, payment_reference, source_payment_type, product_code, currency, gross_amount_minor, net_profit_minor, sub_admin_amount_minor, entry_type, status, refund_amount_minor, created_at",
      { count: "exact" },
    )
    .eq("referral_profile_id", rollup.id)
    .order("created_at", { ascending: false })
    .range(start, start + REFERRAL_PAGE_SIZE - 1);
  if (query.status) ledgerQuery = ledgerQuery.eq("status", query.status);
  if (search) {
    ledgerQuery = ledgerQuery.or(
      `payment_reference.ilike.%${search}%,product_code.ilike.%${search}%`,
    );
  }
  const from = safeDate(query.from);
  const to = safeDate(query.to, true);
  if (from) ledgerQuery = ledgerQuery.gte("created_at", from);
  if (to) ledgerQuery = ledgerQuery.lte("created_at", to);

  const [ledgerResult, payoutResult, analyticsResult] = await Promise.all([
    ledgerQuery,
    admin
      .from("referral_payouts")
      .select(
        "id, payout_date, amount_minor, currency, payment_method, external_reference, status, notes",
      )
      .eq("referral_profile_id", rollup.id)
      .order("payout_date", { ascending: false })
      .limit(50),
    admin.rpc("referral_partner_dashboard_analytics", {
      p_referral_profile_id: rollup.id,
    }),
  ]);
  if (ledgerResult.error || payoutResult.error || analyticsResult.error) {
    throw new Error("Referral accounting activity could not be loaded.");
  }

  const analytics = normalizePartnerAnalytics(analyticsResult.data);

  return {
    preview: false,
    user,
    rollup,
    referralUrl: `${siteUrl}/r/${rollup.referralCode}`,
    activity: await activityRows(ledgerResult.data || [], false),
    activityTotal: ledgerResult.count || 0,
    page: query.page,
    pageSize: REFERRAL_PAGE_SIZE,
    payouts: payoutRows(payoutResult.data || []),
    ...analytics,
    query,
  };
}

export interface ReferralAdminOverview {
  totalSubAdmins: number;
  activeSubAdmins: number;
  suspendedSubAdmins: number;
  totalClicks: number;
  uniqueVisitors: number;
  referredRegistrations: number;
  payingCustomers: number;
  referredPayments: number;
  financials: Record<
    string,
    {
      referredRevenueMinor: string;
      referredProfitMinor: string;
      subAdminCommissionMinor: string;
      superAdminShareMinor: string;
      pendingCommissionMinor: string;
      availableBalanceMinor: string;
      totalPaidMinor: string;
    }
  >;
}

function emptyOverview(): ReferralAdminOverview {
  return {
    totalSubAdmins: 0,
    activeSubAdmins: 0,
    suspendedSubAdmins: 0,
    totalClicks: 0,
    uniqueVisitors: 0,
    referredRegistrations: 0,
    payingCustomers: 0,
    referredPayments: 0,
    financials: {},
  };
}

function normalizeOverview(value: unknown): ReferralAdminOverview {
  const parsed = overviewSchema.safeParse(value);
  if (!parsed.success) return emptyOverview();
  return {
    ...parsed.data,
    financials: Object.fromEntries(
      Object.entries(parsed.data.financials).map(([currency, row]) => {
        const availableLedger = BigInt(minorString(row.availableLedgerMinor));
        const totalPaid = BigInt(minorString(row.totalPaidMinor));
        return [
          currency,
          {
            referredRevenueMinor: minorString(row.referredRevenueMinor),
            referredProfitMinor: minorString(row.referredProfitMinor),
            subAdminCommissionMinor: minorString(row.subAdminCommissionMinor),
            superAdminShareMinor: minorString(row.superAdminShareMinor),
            pendingCommissionMinor: minorString(row.pendingCommissionMinor),
            availableBalanceMinor: (availableLedger - totalPaid).toString(),
            totalPaidMinor: totalPaid.toString(),
          },
        ];
      }),
    ),
  };
}

export async function getReferralAdminDashboard(input: unknown) {
  const actor = await requirePermission("referrals:view");
  const query = referralAdminListQuerySchema.parse(input);
  if (actor.demo) {
    return {
      overview: emptyOverview(),
      partners: [] as ReferralPartnerRollup[],
      total: 0,
      page: query.page,
      pageSize: REFERRAL_PAGE_SIZE,
      query,
    };
  }
  const admin = requireReferralDataClient();
  const session = await createServerSupabaseClient();
  if (!session) throw new Error("Supabase is not configured.");
  await refreshAvailability();
  const start = (query.page - 1) * REFERRAL_PAGE_SIZE;
  const search = safeSearch(query.q);
  const sortColumns: Record<string, string> = {
    created: "created_at",
    name: "display_name",
    clicks: "total_clicks",
    transactions: "successful_transactions",
    activity: "last_referral_activity_at",
  };
  let rowsQuery = admin
    .from("referral_sub_admin_rollup")
    .select("*", { count: "exact" })
    .order(sortColumns[query.sort] || "created_at", {
      ascending: query.direction === "asc",
      nullsFirst: false,
    })
    .range(start, start + REFERRAL_PAGE_SIZE - 1);
  if (search) {
    rowsQuery = rowsQuery.or(
      `display_name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`,
    );
  }
  if (query.partnerStatus === "active") {
    rowsQuery = rowsQuery
      .eq("referral_operational", true)
      .eq("referral_enabled", true);
  } else if (query.partnerStatus === "suspended") {
    rowsQuery = rowsQuery.eq("referral_operational", false);
  } else if (query.partnerStatus === "disabled") {
    rowsQuery = rowsQuery.eq("referral_enabled", false);
  }
  const from = safeDate(query.from);
  const to = safeDate(query.to, true);
  if (from) rowsQuery = rowsQuery.gte("created_at", from);
  if (to) rowsQuery = rowsQuery.lte("created_at", to);

  const [overviewResult, rowsResult] = await Promise.all([
    session.rpc("referral_admin_overview"),
    rowsQuery,
  ]);
  if (overviewResult.error || rowsResult.error) {
    throw new Error("Referral administration data could not be loaded.");
  }
  return {
    overview: normalizeOverview(overviewResult.data),
    partners: (rowsResult.data || []).map(normalizeRollup),
    total: rowsResult.count || 0,
    page: query.page,
    pageSize: REFERRAL_PAGE_SIZE,
    query,
  };
}

export async function getReferralAdminDetails(referralProfileId: string) {
  const actor = await requirePermission("referrals:view");
  if (actor.demo) return null;
  const parsedId = z.string().uuid().safeParse(referralProfileId);
  if (!parsedId.success) return null;
  const admin = requireReferralDataClient();
  await refreshAvailability();
  const { data: rollupRow } = await admin
    .from("referral_sub_admin_rollup")
    .select("*")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!rollupRow) return null;
  const rollup = normalizeRollup(rollupRow);
  const [ledger, payouts, clicks, attributions] = await Promise.all([
    admin
      .from("referral_commission_ledger")
      .select(
        "id, customer_id, payment_reference, source_payment_type, product_code, currency, gross_amount_minor, net_profit_minor, sub_admin_amount_minor, entry_type, status, refund_amount_minor, created_at",
      )
      .eq("referral_profile_id", parsedId.data)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("referral_payouts")
      .select(
        "id, payout_date, amount_minor, currency, payment_method, external_reference, status, notes",
      )
      .eq("referral_profile_id", parsedId.data)
      .order("payout_date", { ascending: false })
      .limit(100),
    admin
      .from("referral_clicks")
      .select(
        "id, referral_code_snapshot, landing_page, event_type, created_at",
      )
      .eq("referral_profile_id", parsedId.data)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("referral_attributions")
      .select(
        "id, user_id, referral_code_snapshot, attributed_at, expires_at, source, landing_page",
      )
      .eq("referral_profile_id", parsedId.data)
      .order("attributed_at", { ascending: false })
      .limit(100),
  ]);

  const auditTargetIds = [
    parsedId.data,
    ...(ledger.data || []).map((row) => String(row.id)),
    ...(payouts.data || []).map((row) => String(row.id)),
  ];
  const { data: audit } = await admin
    .from("admin_audit_logs")
    .select("id, action, reason, administrator_id, created_at")
    .in("target_entity_id", auditTargetIds)
    .order("created_at", { ascending: false })
    .limit(100);

  const attributionRows = attributions.data || [];
  const referredUserIds = attributionRows
    .map((row) => row.user_id)
    .filter((id): id is string => typeof id === "string");
  const { data: referredProfiles } = referredUserIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, email, created_at")
        .in("id", referredUserIds)
    : { data: [] };
  const referredProfileMap = new Map(
    (referredProfiles || []).map((profile) => [String(profile.id), profile]),
  );

  return {
    rollup,
    referralUrl: `${siteUrl}/r/${rollup.referralCode}`,
    activity: await activityRows(ledger.data || [], true),
    payouts: payoutRows(payouts.data || []),
    clicks: clicks.data || [],
    attributions: attributionRows.map((row) => ({
      ...row,
      user: row.user_id
        ? referredProfileMap.get(String(row.user_id)) || null
        : null,
    })),
    audit: audit || [],
    defaultCurrency: appConfig.currency,
  };
}
