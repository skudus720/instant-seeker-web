import type { Metadata } from "next";
import { Download, FileSpreadsheet, Timer, Users } from "lucide-react";
import {
  AdminBarChart,
  AdminDistributionChart,
  AdminOutcomeChart,
} from "@/components/admin/admin-charts";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/admin-ui";
import { getReportData } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Reports" };

function validDate(value: string | undefined, fallback: Date) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : fallback;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 86_400_000);
  const from = validDate(params.from, defaultFrom);
  const toDate = validDate(params.to, defaultTo);
  const to = new Date(toDate.getTime() + 86_400_000);
  const data = await getReportData(from, to);
  const completed = data.analysisSeries.reduce(
    (sum, point) => sum + point.completed,
    0,
  );
  const failed = data.analysisSeries.reduce(
    (sum, point) => sum + point.failed,
    0,
  );
  const newUsers = data.userSeries.reduce((sum, point) => sum + point.count, 0);
  const exportFrom = from.toISOString().slice(0, 10);
  const exportTo = toDate.toISOString().slice(0, 10);
  return (
    <>
      <AdminPageHeader
        eyebrow="Operational intelligence"
        title="Reports"
        description="UTC-normalized trends and sanitized exports. Claimed win records remain distinct from verified, consented, published records."
      />
      <AdminPanel className="mt-6" title="Reporting period">
        <form
          className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"
          method="get"
        >
          <label>
            <span className="text-xs font-black">From (UTC)</span>
            <input
              type="date"
              name="from"
              defaultValue={exportFrom}
              className="mt-2 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-black">To (UTC)</span>
            <input
              type="date"
              name="to"
              defaultValue={exportTo}
              className="mt-2 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <button className="min-h-11 self-end rounded-full bg-ink px-5 text-sm font-black text-white">
            Apply date range
          </button>
        </form>
      </AdminPanel>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="New users"
          value={newUsers.toLocaleString()}
          detail="Selected UTC range"
          icon={Users}
        />
        <AdminMetricCard
          label="Completed analyses"
          value={completed.toLocaleString()}
          detail="Validated completion status"
          icon={FileSpreadsheet}
          tone="success"
        />
        <AdminMetricCard
          label="Failed analyses"
          value={failed.toLocaleString()}
          detail="Recorded failures"
          icon={FileSpreadsheet}
          tone={failed ? "danger" : "default"}
        />
        <AdminMetricCard
          label="Average processing"
          value={
            data.metrics.averageProcessingMs
              ? `${(data.metrics.averageProcessingMs / 1000).toFixed(1)} sec`
              : "No data"
          }
          detail="Completed jobs with telemetry"
          icon={Timer}
        />
      </section>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel title="User growth">
          <AdminBarChart
            points={data.userSeries.map((point) => ({
              label: point.date,
              value: point.count,
            }))}
            primaryLabel="New users"
          />
        </AdminPanel>
        <AdminPanel title="Analysis completion and failure">
          <AdminOutcomeChart completed={completed} failed={failed} />
        </AdminPanel>
        <AdminPanel title="Analysis volume">
          <AdminBarChart
            points={data.analysisSeries.map((point) => ({
              label: point.date,
              value: point.total,
              secondary: point.failed,
            }))}
            primaryLabel="Total"
            secondaryLabel="Failed"
          />
        </AdminPanel>
        <AdminPanel title="Confidence distribution">
          <AdminDistributionChart
            values={["low", "medium", "high"].map((band) => ({
              label: band,
              value:
                data.confidenceBands.find((item) => item.band === band)
                  ?.count || 0,
            }))}
          />
        </AdminPanel>
        <AdminPanel title="Moderation turnaround volume">
          <AdminBarChart
            points={data.moderationSeries.map((point) => ({
              label: point.date,
              value: point.reviews,
              secondary: point.wins,
            }))}
            primaryLabel="Reviews"
            secondaryLabel="Win records"
          />
        </AdminPanel>
      </div>
      <AdminPanel
        className="mt-4"
        title="Sanitized CSV export"
        description="Every export requires a reason and writes an audit event. Exports omit private image paths, signed URLs, secrets, review text, and account identifiers."
      >
        <form
          action="/api/admin/reports/export"
          method="get"
          className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_2fr_auto]"
        >
          <label>
            <span className="text-xs font-black">Report</span>
            <select
              name="type"
              className="mt-2 min-h-11 w-full rounded-md border border-black/12 bg-white px-3 text-sm"
            >
              <option value="user-growth">User growth</option>
              <option value="analysis-volume">Analysis volume</option>
              <option value="provider-performance">
                Provider/model performance
              </option>
              <option value="moderation">Moderation activity</option>
              <option value="verified-wins">
                Verified win-record activity
              </option>
              <option value="reviews">Review activity</option>
              <option value="suspensions">Account suspensions</option>
              <option value="storage">Storage growth</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-black">From (UTC)</span>
            <input
              type="date"
              name="from"
              defaultValue={exportFrom}
              required
              className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-black">To (UTC)</span>
            <input
              type="date"
              name="to"
              defaultValue={exportTo}
              required
              className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-black">Export reason</span>
            <input
              name="reason"
              required
              minLength={5}
              maxLength={1000}
              placeholder="Operational reporting purpose"
              className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
            />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-full bg-ink px-5 text-sm font-black text-white">
            <Download className="size-4" /> Export CSV
          </button>
        </form>
      </AdminPanel>
    </>
  );
}
