import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  AdminActionDialog,
  AdminNotice,
} from "@/components/admin/admin-actions";
import { DiagnosticCopy } from "@/components/admin/diagnostic-copy";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/admin-ui";
import { getSystemHealthData } from "@/lib/admin/data";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "System health" };

export default async function AdminSystemHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [params, data, actor] = await Promise.all([
    searchParams,
    getSystemHealthData(),
    requirePermission("system:view"),
  ]);
  const diagnostic = {
    generated_at: new Date().toISOString(),
    application_version: data.version,
    checks: data.checks,
    failed_job_count: data.failedJobs.length,
    stale_job_count: data.staleJobs.length,
    rate_limit_events_24h: data.rateLimitCount,
    average_request_ms_24h: data.averageRequestMs,
    recent_events: data.events.slice(0, 10).map((event) => ({
      severity: event.severity,
      source: event.source,
      event_type: event.event_type,
      created_at: event.created_at,
    })),
  };
  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="System health"
        description="Availability probes, redacted events, failed jobs, stale processing work, request duration, and application version. Credentials and authorization headers are never rendered."
        actions={<DiagnosticCopy diagnostic={diagnostic} />}
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Application version"
          value={data.version}
          detail="Commit SHA when configured"
          icon={ShieldCheck}
        />
        <AdminMetricCard
          label="Failed jobs shown"
          value={data.failedJobs.length.toLocaleString()}
          detail="Most recent failures"
          icon={AlertTriangle}
          tone={data.failedJobs.length ? "danger" : "default"}
        />
        <AdminMetricCard
          label="Stale jobs"
          value={data.staleJobs.length.toLocaleString()}
          detail="Processing longer than 10 minutes"
          icon={Clock3}
          tone={data.staleJobs.length ? "warning" : "default"}
        />
        <AdminMetricCard
          label="Request duration"
          value={
            data.averageRequestMs ? `${data.averageRequestMs} ms` : "No data"
          }
          detail={`${data.rateLimitCount} blocked rate-limit events in 24h`}
          icon={Gauge}
        />
      </section>
      <AdminPanel className="mt-4" title="Service checks">
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          {data.checks.length ? (
            data.checks.map((check) => (
              <article
                key={check.label}
                className="rounded-lg border border-black/10 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Activity className="size-4 text-signal-ink" />
                  <AdminStatusBadge status={check.status} />
                </div>
                <h2 className="mt-4 text-sm font-black">{check.label}</h2>
                <p className="mt-2 text-xs leading-5 text-black/45">
                  {check.detail}
                </p>
              </article>
            ))
          ) : (
            <div className="sm:col-span-2 xl:col-span-5">
              <AdminEmptyState
                title="No live probes in demo preview"
                description="Operational checks require a configured Supabase project."
              />
            </div>
          )}
        </div>
      </AdminPanel>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel
          title="Recent failed analyses"
          description="Retry selected jobs without creating duplicate active retries."
        >
          {data.failedJobs.length ? (
            <div className="divide-y divide-black/8">
              {data.failedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/analyses/${job.id}`}
                      className="font-mono text-xs font-black hover:underline"
                    >
                      {job.id}
                    </Link>
                    <p className="mt-1 text-xs text-black/45">
                      {job.provider} · {job.error_code || "Unclassified"} ·{" "}
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                  <AdminActionDialog
                    kind="analysis_retry"
                    targetId={job.id}
                    label="Retry"
                    title="Retry failed analysis"
                    description="Queue one retry using the stored configuration. Duplicate active retries are rejected."
                  />
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No recent failed analyses"
              description="No failed jobs are recorded."
            />
          )}
        </AdminPanel>
        <AdminPanel
          title="Stale processing jobs"
          description="Only a super administrator can mark a confirmed stale job failed."
        >
          {data.staleJobs.length ? (
            <div className="divide-y divide-black/8">
              {data.staleJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/analyses/${job.id}`}
                      className="font-mono text-xs font-black hover:underline"
                    >
                      {job.id}
                    </Link>
                    <p className="mt-1 text-xs text-black/45">
                      Started{" "}
                      {job.processing_started_at
                        ? new Date(job.processing_started_at).toLocaleString()
                        : "at an unknown time"}
                    </p>
                  </div>
                  {actor.role === "super_admin" ? (
                    <AdminActionDialog
                      kind="analysis_mark_stale_failed"
                      targetId={job.id}
                      label="Mark failed"
                      title="Mark stale job failed"
                      description="Confirm that the processing window has elapsed. The failure and reason are audited."
                      tone="danger"
                    />
                  ) : (
                    <AdminStatusBadge status="warning" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No stale processing jobs"
              description="No jobs exceed the ten-minute stale threshold."
            />
          )}
        </AdminPanel>
      </div>
      <AdminPanel
        className="mt-4"
        title="Recent redacted system events"
        description="Details are sanitized before storage; resolve workflow integration remains an operational extension point."
      >
        {data.events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-left text-xs">
              <thead className="border-b border-black/10 bg-black/[0.025] text-black/45 uppercase">
                <tr>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Message</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">State</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={event.id} className="border-b border-black/8">
                    <td className="p-4">
                      <AdminStatusBadge status={event.severity} />
                    </td>
                    <td className="p-4 font-bold">{event.source}</td>
                    <td className="p-4">{event.event_type}</td>
                    <td className="max-w-md p-4 leading-5 text-black/55">
                      {event.message}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {event.resolved_at ? "Resolved" : "Open"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="No system events"
            description="No operational events are recorded."
          />
        )}
      </AdminPanel>
    </>
  );
}
