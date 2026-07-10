import type { Metadata } from "next";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  FileCheck2,
  MessageSquareText,
} from "lucide-react";
import {
  ReviewModerationList,
  WinModerationList,
} from "@/components/admin/moderation-list";
import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth";
import { getPublicStats } from "@/lib/public-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const [{ data: wins }, { data: reviews }, stats] = await Promise.all([
    supabase!
      .from("win_records")
      .select("id, amount, currency, won_at, created_at, ticket_image_path")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    supabase!
      .from("reviews")
      .select("id, rating, body, created_at")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    getPublicStats(),
  ]);
  const summary = [
    {
      label: "Verified winners",
      value: stats.verifiedWinners.toLocaleString(),
      icon: BadgeCheck,
    },
    {
      label: "Verified amount",
      value: formatCurrency(stats.totalVerifiedAmountWon, stats.currency),
      icon: FileCheck2,
    },
    {
      label: "Completed analyses",
      value: stats.screenshotsAnalyzed.toLocaleString(),
      icon: ChartNoAxesCombined,
    },
    {
      label: "Published rating",
      value:
        stats.averagePublishedRating == null
          ? "Not rated"
          : `${stats.averagePublishedRating.toFixed(1)} / 5`,
      icon: MessageSquareText,
    },
  ];
  return (
    <AppShell user={user}>
      <p className="text-xs font-black text-[#8a7200] uppercase">
        Server-authorized area
      </p>
      <h1 className="mt-2 text-3xl font-black text-[#090909] sm:text-5xl">
        Content verification
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/52">
        Approval changes public content. Confirm evidence, privacy, and wording
        before publishing any record.
      </p>
      <section
        className="mt-8 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Verified aggregate statistics"
      >
        {summary.map((item) => (
          <div key={item.label} className="bg-white p-5">
            <item.icon className="size-5 text-[#a48600]" aria-hidden="true" />
            <p className="mt-5 text-xs font-bold text-black/40 uppercase">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-black text-[#090909]">
              {item.value}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-12" aria-labelledby="win-moderation">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2
              id="win-moderation"
              className="text-xl font-black text-[#090909]"
            >
              Win record review
            </h2>
            <p className="mt-1 text-sm text-black/45">
              Private ticket images are streamed only after a server-side admin
              check.
            </p>
          </div>
          <span className="rounded-full bg-[#090909] px-3 py-1 text-xs font-black text-white">
            {wins?.length || 0} pending
          </span>
        </div>
        <WinModerationList wins={wins || []} />
      </section>
      <section className="mt-12" aria-labelledby="review-moderation">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2
              id="review-moderation"
              className="text-xl font-black text-[#090909]"
            >
              Review moderation
            </h2>
            <p className="mt-1 text-sm text-black/45">
              Approval publishes the original text and rating unchanged.
            </p>
          </div>
          <span className="rounded-full bg-[#090909] px-3 py-1 text-xs font-black text-white">
            {reviews?.length || 0} pending
          </span>
        </div>
        <ReviewModerationList reviews={reviews || []} />
      </section>
    </AppShell>
  );
}
