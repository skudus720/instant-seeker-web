import type { Metadata } from "next";
import { FileClock } from "lucide-react";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { analysisResultSchema } from "@/lib/analysis/schema";
import { requirePaidUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/lib/types";

export const metadata: Metadata = { title: "Analysis history" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requirePaidUser("/history");
  let analyses: AnalysisResult[] = [];
  if (!user.demo) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase!
      .from("analyses")
      .select("result")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50);
    analyses = (data || []).flatMap((row) => {
      const parsed = analysisResultSchema.safeParse(row.result);
      return parsed.success ? [parsed.data as AnalysisResult] : [];
    });
  }
  return (
    <AppShell user={user} current="history">
      <p className="text-xs font-black text-signal-ink uppercase">
        Account records
      </p>
      <h1 className="mt-2 text-3xl font-black text-ink sm:text-5xl">
        Analysis history
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-black/52">
        Only your own completed analyses are available here. Private screenshots
        are never exposed through public URLs.
      </p>
      <div className="mt-9">
        {analyses.length ? (
          <div className="grid gap-7">
            {analyses.map((analysis) => (
              <AnalysisResultCard key={analysis.id} result={analysis} compact />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileClock}
            title="No analysis history"
            description={
              user.demo
                ? "Demo results are not persisted. Configure Supabase to enable private history."
                : "Complete your first screenshot analysis and the report will appear here."
            }
          />
        )}
      </div>
    </AppShell>
  );
}
