import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  MessageSquareText,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  AdminBarChart,
  AdminDistributionChart,
  AdminOutcomeChart,
} from "@/components/admin/admin-charts";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/admin-ui";
import { getDashboardData } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Dashboard" };

function formatDuration(milliseconds: number) {
  if (!milliseconds) return "No data";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} sec`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const days = Number(params.range || 30);
  const data = await getDashboardData(days);
  const metrics = data.metrics;
  const completedInRange = data.analysisSeries.reduce(
    (sum, point) => sum + point.completed,
    0,
  );
  const failedInRange = data.analysisSeries.reduce(
    (sum, point) => sum + point.failed,
    0,
  );
  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Admin dashboard"
        description="A live operational view calculated from production records. Empty values remain empty; demonstration or rejected records never inflate verified metrics."
        actions={
          <form className="flex items-center gap-2" method="get">
            <label htmlFor="dashboard-range" className="sr-only">
              Dashboard date range
            </label>
            <select
              id="dashboard-range"
              name="range"
              defaultValue={String(data.range.days)}
              className="admin-interactive min-h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
            <button className="admin-interactive min-h-10 rounded-full bg-ink px-4 text-sm font-black text-white hover:bg-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Apply
            </button>
          </form>
        }
      />

      <section
        className="admin-metric-grid mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Operational metrics"
      >
        <AdminMetricCard
          label="Registered users"
          value={metrics.totalUsers.toLocaleString()}
          detail={`${metrics.newUsersToday} joined today`}
          icon={Users}
        />
        <AdminMetricCard
          label="Active users"
          value={metrics.activeUsers24h.toLocaleString()}
          detail={`${metrics.activeUsers7d} in 7d · ${metrics.activeUsers30d} in 30d`}
          icon={Activity}
        />
        <AdminMetricCard
          label="Total analyses"
          value={metrics.totalAnalyses.toLocaleString()}
          detail={`${metrics.analysesCompletedToday} completed today`}
          icon={BrainCircuit}
        />
        <AdminMetricCard
          label="Completion rate"
          value={`${metrics.analysisCompletionRate.toFixed(1)}%`}
          detail={`Average ${formatDuration(metrics.averageProcessingMs)}`}
          icon={CheckCircle2}
          tone="success"
        />
        <AdminMetricCard
          label="Pending analyses"
          value={metrics.pendingAnalyses.toLocaleString()}
          detail="Pending and processing"
          icon={Clock3}
          tone={metrics.pendingAnalyses ? "warning" : "default"}
        />
        <AdminMetricCard
          label="Failed analyses"
          value={metrics.failedAnalyses.toLocaleString()}
          detail="All recorded failures"
          icon={AlertTriangle}
          tone={metrics.failedAnalyses ? "danger" : "default"}
        />
        <AdminMetricCard
          label="Reviews awaiting moderation"
          value={metrics.reviewsAwaitingModeration.toLocaleString()}
          detail="Unpublished submissions"
          icon={MessageSquareText}
          tone={metrics.reviewsAwaitingModeration ? "warning" : "default"}
        />
        <AdminMetricCard
          label="Win records awaiting review"
          value={metrics.winsAwaitingVerification.toLocaleString()}
          detail={`${metrics.verifiedPublicWins} verified and public`}
          icon={Trophy}
          tone={metrics.winsAwaitingVerification ? "warning" : "default"}
        />
        <AdminMetricCard
          label="Private storage"
          value={formatBytes(metrics.privateStorageBytes)}
          detail="Screenshots and ticket evidence"
          icon={HardDrive}
        />
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminPanel
          title="Analyses over time"
          description="Completed and failed jobs in the selected date range."
        >
          <AdminBarChart
            points={data.analysisSeries.map((point) => ({
              label: point.date,
              value: point.completed,
              secondary: point.failed,
            }))}
            primaryLabel="Completed"
            secondaryLabel="Failed"
          />
        </AdminPanel>
        <AdminPanel
          title="New users over time"
          description="New account records, excluding deleted profiles."
        >
          <AdminBarChart
            points={data.userSeries.map((point) => ({
              label: point.date,
              value: point.count,
            }))}
            primaryLabel="New users"
          />
        </AdminPanel>
        <AdminPanel
          title="Successful versus failed"
          description="Finished analysis outcomes in this range."
        >
          <AdminOutcomeChart
            completed={completedInRange}
            failed={failedInRange}
          />
        </AdminPanel>
        <AdminPanel
          title="Confidence-band distribution"
          description="Validated confidence bands, not guaranteed outcome claims."
        >
          <AdminDistributionChart
            values={["low", "medium", "high"].map((band) => ({
              label: band,
              value:
                data.confidenceBands.find((item) => item.band === band)
                  ?.count || 0,
              tone:
                band === "high"
                  ? "h-full bg-emerald-600"
                  : band === "medium"
                    ? "h-full bg-signal"
                    : "h-full bg-alert",
            }))}
          />
        </AdminPanel>
        <AdminPanel
          title="Moderation queue volume"
          description="Review and win-record submissions received over time."
        >
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
        <AdminPanel
          title="Average processing time"
          description="Measured only from completed jobs with processing telemetry."
        >
          <div className="min-h-56 bg-ink p-6 text-white sm:p-8">
            <Clock3 className="size-5 text-signal" aria-hidden="true" />
            <p className="mt-8 text-4xl font-black tabular-nums">
              {formatDuration(metrics.averageProcessingMs)}
            </p>
            <p className="mt-2 text-xs text-white/48">
              Selected reporting range
            </p>
          </div>
        </AdminPanel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminPanel
          title="Recent administrative activity"
          description="Sensitive operations are preserved in append-only audit history."
          action={
            <Link
              href="/admin/audit-logs"
              className="text-xs font-black underline underline-offset-4"
            >
              View audit logs
            </Link>
          }
        >
          {data.recentAudit.length ? (
            <ol className="divide-y divide-black/8">
              {data.recentAudit.map((entry) => (
                <li
                  key={String(entry.id)}
                  className="admin-list-row flex items-start gap-3 px-5 py-4"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-black/5">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {String(entry.action || "Administrative action")}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-black/48">
                      {String(entry.reason || "Reason recorded")}
                    </p>
                    <p className="mt-2 text-[11px] text-black/35">
                      {new Date(String(entry.created_at)).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <AdminEmptyState
              title="No administrative activity"
              description="Audited staff actions will appear here."
            />
          )}
        </AdminPanel>
        <AdminPanel
          title="Recent system errors"
          description="Redacted application events requiring operational attention."
          action={
            <Link
              href="/admin/system-health"
              className="text-xs font-black underline underline-offset-4"
            >
              Open system health
            </Link>
          }
        >
          {data.recentErrors.length ? (
            <ol className="divide-y divide-black/8">
              {data.recentErrors.map((event) => (
                <li
                  key={String(event.id)}
                  className="admin-list-row flex items-start gap-3 px-5 py-4"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-alert/8 text-alert">
                    <Database className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black">
                        {String(event.event_type || "System event")}
                      </p>
                      <AdminStatusBadge
                        status={String(event.severity || "error")}
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-black/48">
                      {String(event.message || "Redacted error detail")}
                    </p>
                    <p className="mt-2 text-[11px] text-black/35">
                      {new Date(String(event.created_at)).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <AdminEmptyState
              title="No recent system errors"
              description="No error or critical events are recorded."
            />
          )}
        </AdminPanel>
      </div>
    </>
  );
}
