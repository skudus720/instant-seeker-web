import type { Metadata } from "next";
import {
  ArrowRight,
  Database,
  FileSearch,
  History,
  LockKeyhole,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import { ScreenshotUploader } from "@/components/dashboard/screenshot-uploader";
import { AppShell } from "@/components/layout/app-shell";
import { DisclaimerBanner } from "@/components/ui/disclaimer-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { analysisResultSchema } from "@/lib/analysis/schema";
import { hasRoleBasedAnalysisAccess } from "@/lib/admin/permissions";
import { requirePaidUser } from "@/lib/auth";
import { isSubscriptionActive } from "@/lib/subscriptions/access";
import { getSubscriptionPlan } from "@/lib/subscriptions/plans";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

async function getRecentAnalyses(userId: string, demo: boolean) {
  if (demo) return { recent: [] as AnalysisResult[], total: 0 };
  const supabase = await createServerSupabaseClient();
  const { data, count } = await supabase!
    .from("analyses")
    .select("id, result, created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(2);
  const recent = (data || []).flatMap((row) => {
    const parsed = analysisResultSchema.safeParse(row.result);
    return parsed.success ? [parsed.data as AnalysisResult] : [];
  });
  return { recent, total: count || 0 };
}

export default async function DashboardPage() {
  const user = await requirePaidUser("/dashboard");
  const { recent, total } = await getRecentAnalyses(user.id, user.demo);
  const canAnalyze =
    user.demo ||
    hasRoleBasedAnalysisAccess(user.role) ||
    isSubscriptionActive(user.subscription);
  const activePlan = user.subscription
    ? getSubscriptionPlan(user.subscription.planCode)
    : null;
  return (
    <AppShell user={user} current="dashboard">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black text-signal-ink uppercase">
            Private workspace
          </p>
          <h1 className="mt-2 text-3xl font-black text-ink sm:text-5xl">
            Welcome, {user.displayName.split(" ")[0]}
          </h1>
          <p className="mt-3 text-sm text-black/52">
            Submit a clear screenshot for one-time processing. The image is
            discarded afterward.
          </p>
        </div>
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-black/18 bg-white px-4 py-2 text-sm font-black text-ink hover:border-black"
        >
          <History className="size-4" aria-hidden="true" />
          View history
        </Link>
      </div>
      {user.demo ? (
        <div className="mt-7 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Demonstration mode is active. Uploads are processed in memory, not
          stored, and any fixture notes are treated as user-provided context.
        </div>
      ) : null}
      <section
        className="mt-7 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-3"
        aria-label="Usage summary"
      >
        <div className="flex items-center gap-4 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-md bg-ink text-signal">
            <ScanLine className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-black/42 uppercase">
              Completed analyses
            </p>
            <p className="mt-1 text-2xl font-black text-ink">{total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-md bg-success-soft text-emerald-800">
            <Database className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-black/42 uppercase">
              Screenshot retention
            </p>
            <p className="mt-1 font-black text-ink">Not retained</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-md bg-signal-soft text-signal-ink">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-black/42 uppercase">
              AI access
            </p>
            <p className="mt-1 font-black text-ink">
              {user.demo
                ? "Demo preview"
                : activePlan
                  ? `${activePlan.name} active`
                  : hasRoleBasedAnalysisAccess(user.role)
                    ? "Partner access"
                    : "Plan required"}
            </p>
          </div>
        </div>
      </section>
      <section className="mt-8" aria-labelledby="upload-title">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="upload-title" className="text-xl font-black text-ink">
              New screenshot analysis
            </h2>
            <p className="mt-1 text-sm text-black/45">
              Personal identifiers should be cropped before upload.
            </p>
          </div>
          <span className="hidden rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 sm:inline-flex">
            Processed, not stored
          </span>
        </div>
        {canAnalyze ? (
          <ScreenshotUploader demoMode={user.demo} />
        ) : (
          <div className="grid min-h-80 place-items-center rounded-lg border border-black/12 bg-white px-6 py-12 text-center">
            <div className="max-w-lg">
              <span className="mx-auto grid size-14 place-items-center rounded-md bg-ink text-signal">
                <LockKeyhole className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-black text-ink">
                Choose an AI access plan
              </h3>
              <p className="mt-3 text-sm leading-6 text-black/52">
                Your account is active and your saved history remains available.
                Select a time-limited plan before starting a new analysis.
              </p>
              <Link
                href="/plans"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-signal px-5 py-3 text-sm font-black text-ink hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink"
              >
                View AI plans
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </section>
      <DisclaimerBanner className="mt-8 bg-ink" />
      <section className="mt-12" aria-labelledby="recent-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="recent-title" className="text-xl font-black text-ink">
              Recent analyses
            </h2>
            <p className="mt-1 text-sm text-black/45">
              Completed reports saved to your account.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-black text-black/60">
            <FileSearch className="size-4" aria-hidden="true" />
            {total}
          </span>
        </div>
        {recent.length ? (
          <div className="grid gap-6">
            {recent.map((result) => (
              <AnalysisResultCard key={result.id} result={result} compact />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileSearch}
            title="No saved analyses yet"
            description={
              user.demo
                ? "Demo analyses are intentionally not stored. Connect Supabase to save account history."
                : "Your completed screenshot reports will appear here."
            }
          />
        )}
      </section>
      <aside className="mt-8 flex items-start gap-3 rounded-md border border-black/10 bg-white p-5 text-sm leading-6 text-black/58">
        <ShieldAlert
          className="mt-0.5 size-5 shrink-0 text-signal-ink"
          aria-hidden="true"
        />
        <p>
          <strong className="text-ink">Responsible-use reminder:</strong>{" "}
          probability estimates cannot remove uncertainty. Set limits, never
          chase losses, and stop when betting stops being recreational.
        </p>
      </aside>
    </AppShell>
  );
}
