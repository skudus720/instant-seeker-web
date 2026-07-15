import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = path.join(process.cwd(), "supabase", "migrations");
const referralSql = [
  "202607110008_referral_finance.sql",
  "202607110009_referral_functions.sql",
  "202607110011_referral_partner_dashboard.sql",
]
  .map((file) => fs.readFileSync(path.join(migrationDirectory, file), "utf8"))
  .join("\n");
const webhookSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/payments/paystack/webhook/route.ts"),
  "utf8",
);
const callbackSources = [
  "src/app/api/payments/paystack/callback/route.ts",
  "src/app/api/payments/paystack/subscription/callback/route.ts",
]
  .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
  .join("\n");

describe("referral database contract", () => {
  it("generates random case-insensitive unique codes and safely backfills sub-admins", () => {
    expect(referralSql).toContain("gen_random_bytes(8)");
    expect(referralSql).toMatch(
      /unique index sub_admin_referral_code_ci_unique_idx[\s\S]*lower\(referral_code\)/,
    );
    expect(referralSql).toMatch(
      /select public\.ensure_sub_admin_referral_profile\(id\)[\s\S]*where role = 'sub_admin'/,
    );
    expect(referralSql).toContain("exception when unique_violation");
  });

  it("rejects invalid, disabled, suspended, expired, and self attribution", () => {
    expect(referralSql).toMatch(
      /capture_referral_attribution[\s\S]*referral_enabled = true[\s\S]*profile\.role = 'sub_admin'/,
    );
    expect(referralSql).toContain("p_user_id = v_candidate.user_id");
    expect(referralSql).toMatch(
      /claim_referral_attribution[\s\S]*attribution\.expires_at > now\(\)/,
    );
  });

  it("enforces first-valid user and visitor attribution in the database", () => {
    expect(referralSql).toMatch(/visitor_token_hash text not null unique/);
    expect(referralSql).toMatch(
      /referral_attributions_one_user_idx[\s\S]*where user_id is not null/,
    );
  });

  it("creates one exact immutable earning per verified payment", () => {
    expect(referralSql).toMatch(
      /referral_commission_one_earning_per_payment_idx[\s\S]*entry_type = 'earning'/,
    );
    expect(referralSql).toContain("v_super_amount := v_profit - v_sub_amount");
    expect(referralSql).toContain(
      "sub_admin_amount_minor + super_admin_amount_minor = net_profit_minor",
    );
    expect(referralSql).toContain("commission financial fields are immutable");
    expect(referralSql).toContain("commission ledger entries are append-only");
  });

  it("awards no commission for direct, unsettled, ineligible, or non-positive-profit payments", () => {
    expect(referralSql).toContain("settled signup payment not found");
    expect(referralSql).toContain("settled subscription payment not found");
    expect(referralSql).toContain(
      "if v_referral_profile_id is null or v_sub_admin_id is null then return null",
    );
    expect(referralSql).toContain("if v_profit <= 0 then return null");
  });

  it("uses linked negative capped reversals without deleting earnings", () => {
    expect(referralSql).toContain(
      "least(p_refund_amount_minor, v_remaining_gross)",
    );
    expect(referralSql).toContain("parent_earning_id");
    expect(referralSql).toContain("-v_sub_reduction");
    expect(referralSql).not.toMatch(
      /delete from public\.referral_commission_ledger/i,
    );
  });

  it("locks payout rows, blocks pending/negative balances, and allocates FIFO", () => {
    expect(referralSql).toMatch(
      /admin_record_referral_payout[\s\S]*for update[\s\S]*v_available_balance <= 0/,
    );
    expect(referralSql).toContain("payout exceeds the available balance");
    expect(referralSql).toMatch(
      /order by ledger\.available_at, ledger\.created_at, ledger\.id[\s\S]*for update of ledger/,
    );
    expect(referralSql).toContain(
      "referral_payout_external_reference_unique_idx",
    );
    expect(referralSql).toContain("admin_cancel_referral_payout");
    expect(referralSql).toContain("payout financial fields are immutable");
  });

  it("limits partner RLS to own records and reserves mutations for super-admin RPCs", () => {
    expect(referralSql).toMatch(
      /referral_ledger_select_own_or_super_admin[\s\S]*profile\.user_id = auth\.uid\(\)/,
    );
    expect(referralSql).toMatch(
      /admin_record_referral_payout[\s\S]*public\.is_super_admin\(\)/,
    );
    expect(referralSql).not.toMatch(
      /grant\s+(?:insert|update|delete)[^;]*referral_commission_ledger/i,
    );
  });

  it("derives partner dashboard analytics on the trusted server without arbitrary totals", () => {
    expect(referralSql).toContain("referral_partner_dashboard_analytics");
    expect(referralSql).toContain("auth.role() <> 'service_role'");
    expect(referralSql).toMatch(
      /package_analytics[\s\S]*sum\(ledger\.gross_amount_minor\)::bigint/,
    );
    expect(referralSql).toMatch(
      /payment_status[\s\S]*'failed'[\s\S]*'completed'[\s\S]*'pending'/,
    );
    expect(referralSql).toMatch(
      /grant execute on function public\.referral_partner_dashboard_analytics\(uuid\)[\s\S]*to service_role/,
    );
  });
});

describe("verified webhook source of truth", () => {
  it("creates earnings and reversals only from the signed webhook route", () => {
    expect(webhookSource).toContain("hasValidPaystackSignature");
    expect(webhookSource).toContain("recordReferralCommission");
    expect(webhookSource).toContain("recordReferralReversal");
    expect(callbackSources).not.toContain("recordReferralCommission");
    expect(callbackSources).not.toContain("recordReferralReversal");
  });
});
