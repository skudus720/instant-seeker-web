import type { Metadata } from "next";
import {
  Database,
  FileSearch,
  History,
  ScanLine,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import { ScreenshotUploader } from "@/components/dashboard/screenshot-uploader";
import { AppShell } from "@/components/layout/app-shell";
import { DisclaimerBanner } from "@/components/ui/disclaimer-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { analysisResultSchema } from "@/lib/analysis/schema";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser("/dashboard");
  const { recent, total } = await getRecentAnalyses(user.id, user.demo);
  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black text-[#8a7200] uppercase">
            Private workspace
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#090909] sm:text-5xl">
            Welcome, {user.displayName.split(" ")[0]}
          </h1>
          <p className="mt-3 text-sm text-black/52">
            Upload a clear screenshot to begin a new analysis.
          </p>
        </div>
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-black/18 bg-white px-4 py-2 text-sm font-black text-[#090909] hover:border-black"
        >
          <History className="size-4" aria-hidden="true" />
          View history
        </Link>
      </div>
      {user.demo ? (
        <div className="mt-7 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Demonstration mode is active. Uploads are processed in memory, not
          stored, and the result performs no fixture extraction.
        </div>
      ) : null}
      <section
        className="mt-7 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2"
        aria-label="Usage summary"
      >
        <div className="flex items-center gap-4 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-md bg-[#090909] text-[#ffd400]">
            <ScanLine className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-black/42 uppercase">
              Completed analyses
            </p>
            <p className="mt-1 text-2xl font-black text-[#090909]">{total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-md bg-[#e9fbee] text-emerald-800">
            <Database className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-black/42 uppercase">
              Screenshot storage
            </p>
            <p className="mt-1 font-black text-[#090909]">
              {user.demo ? "Not retained in demo" : "Private account storage"}
            </p>
          </div>
        </div>
      </section>
      <section className="mt-8" aria-labelledby="upload-title">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="upload-title" className="text-xl font-black text-[#090909]">
              New screenshot analysis
            </h2>
            <p className="mt-1 text-sm text-black/45">
              Personal identifiers should be cropped before upload.
            </p>
          </div>
          <span className="hidden rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 sm:inline-flex">
            Private upload
          </span>
        </div>
        <ScreenshotUploader />
      </section>
      <DisclaimerBanner className="mt-8 bg-[#090909]" />
      <section className="mt-12" aria-labelledby="recent-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="recent-title" className="text-xl font-black text-[#090909]">
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
          className="mt-0.5 size-5 shrink-0 text-[#a48600]"
          aria-hidden="true"
        />
        <p>
          <strong className="text-[#090909]">Responsible-use reminder:</strong>{" "}
          probability estimates cannot remove uncertainty. Set limits, never
          chase losses, and stop when betting stops being recreational.
        </p>
      </aside>
    </AppShell>
  );
}
