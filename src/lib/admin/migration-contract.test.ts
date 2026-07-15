import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = path.join(process.cwd(), "supabase", "migrations");
const migrationSql = fs
  .readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => fs.readFileSync(path.join(migrationDirectory, file), "utf8"))
  .join("\n");

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

describe("admin database security contract", () => {
  it("keeps cross-user analyses private while granting server-verified staff access", () => {
    expect(migrationSql).toMatch(
      /analyses_select_own[\s\S]*user_id\s*=\s*auth\.uid\(\)/,
    );
    expect(migrationSql).toMatch(
      /analyses_admin_read[\s\S]*public\.is_admin\(\)/,
    );
  });

  it("keeps screenshot and evidence buckets private and owner-scoped", () => {
    expect(migrationSql).toMatch(
      /'analysis-screenshots'[\s\S]*false[\s\S]*10485760/,
    );
    expect(migrationSql).toMatch(
      /analysis_images_select_own[\s\S]*storage\.foldername\(name\)[\s\S]*auth\.uid\(\)/,
    );
    expect(migrationSql).toMatch(
      /win_images_select_own[\s\S]*storage\.foldername\(name\)[\s\S]*auth\.uid\(\)/,
    );
  });

  it("publishes only approved reviews and verified, consented, non-demo wins", () => {
    expect(migrationSql).toMatch(
      /get_public_reviews[\s\S]*moderation_status\s*=\s*'approved'[\s\S]*is_sample\s*=\s*false/,
    );
    expect(migrationSql).toMatch(
      /sync_public_win_activity[\s\S]*verification_status\s*=\s*'published'[\s\S]*consent_to_publish\s*=\s*true[\s\S]*is_sample\s*=\s*false/,
    );
  });

  it("prevents duplicate active retries and self-directed role changes", () => {
    expect(migrationSql).toMatch(
      /analysis_retry_one_active_idx[\s\S]*status in \('pending', 'processing'\)/,
    );
    expect(migrationSql).toContain(
      "administrators cannot change their own role",
    );
  });

  it("keeps audit records append-only for authenticated staff", () => {
    expect(migrationSql).toMatch(
      /revoke all on public\.admin_audit_logs[\s\S]*grant select on public\.admin_audit_logs/,
    );
    expect(migrationSql).not.toMatch(
      /grant\s+(?:update|delete)[^;]*admin_audit_logs/i,
    );
  });

  it("audits every sensitive administrative RPC family", () => {
    for (const action of [
      "user.",
      "analysis.",
      "review.",
      "win_record.",
      "content.published",
      "ai_config.activated",
      "setting.updated",
      "report.exported",
    ]) {
      expect(migrationSql).toContain(action);
    }
    expect(migrationSql).toContain("public.insert_admin_audit(");
  });
});

describe("client secret boundary", () => {
  it("does not reference privileged environment keys from client modules", () => {
    const clientModules = sourceFiles(path.join(process.cwd(), "src")).filter(
      (file) => /^\s*["']use client["'];/m.test(fs.readFileSync(file, "utf8")),
    );
    for (const file of clientModules) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(source, file).not.toContain("ANALYSIS_PROVIDER_API_KEY");
      expect(source, file).not.toContain("PAYSTACK_SECRET_KEY");
      expect(source, file).not.toContain("REFERRAL_ATTRIBUTION_SECRET");
      expect(source, file).not.toContain("@/lib/supabase/admin");
    }
    expect(
      fs.readFileSync(
        path.join(process.cwd(), "src/lib/supabase/admin.ts"),
        "utf8",
      ),
    ).toContain('import "server-only"');
  });
});
