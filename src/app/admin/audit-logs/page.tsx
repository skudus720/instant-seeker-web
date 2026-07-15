import type { Metadata } from "next";
import { FileClock, Search } from "lucide-react";
import { AdminColumnVisibility } from "@/components/admin/column-visibility";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminStatusBadge,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from "@/components/admin/admin-ui";
import { getAuditData } from "@/lib/admin/data";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entity?: string;
    administrator?: string;
    from?: string;
    to?: string;
    direction?: "asc" | "desc";
  }>;
}) {
  const params = await searchParams;
  const [data, actor] = await Promise.all([
    getAuditData({
      page: Number(params.page || 1),
      action: params.action,
      entity: params.entity,
      administrator: params.administrator,
      from: params.from,
      to: params.to,
      direction: params.direction,
    }),
    requirePermission("audit:view"),
  ]);
  return (
    <>
      <AdminPageHeader
        eyebrow="Append-only security history"
        title="Audit logs"
        description={
          actor.role === "super_admin"
            ? "Review all sensitive administrative actions and redacted request metadata. Audit records cannot be edited or deleted through this interface."
            : "Review your own administrative actions. Sensitive network metadata is restricted to super administrators."
        }
      />
      <AdminPanel className="mt-6" title="Filter audit events">
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7"
          method="get"
        >
          <label className="relative">
            <span className="sr-only">Action filter</span>
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-black/35" />
            <input
              name="action"
              defaultValue={params.action}
              placeholder="Action contains"
              className="min-h-11 w-full rounded-md border border-black/10 pr-3 pl-10 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Entity type</span>
            <select
              name="entity"
              defaultValue={params.entity || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All entities</option>
              <option value="user">User</option>
              <option value="analysis">Analysis</option>
              <option value="review">Review</option>
              <option value="win_record">Win record</option>
              <option value="content_version">Content version</option>
              <option value="ai_config_version">AI configuration</option>
              <option value="site_setting">Setting</option>
              <option value="report">Report</option>
            </select>
          </label>
          {actor.role === "super_admin" ? (
            <label>
              <span className="sr-only">Administrator UUID</span>
              <input
                name="administrator"
                defaultValue={params.administrator}
                placeholder="Administrator UUID"
                className="min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
              />
            </label>
          ) : null}
          <label>
            <span className="sr-only">From date</span>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">To date</span>
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Sort direction</span>
            <select
              name="direction"
              defaultValue={params.direction || "desc"}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
          <button className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white">
            Apply filters
          </button>
        </form>
      </AdminPanel>
      <AdminPanel
        className="mt-4"
        title={`${data.total.toLocaleString()} audit events`}
        action={
          <AdminColumnVisibility
            tableId="admin-audit-table"
            columns={
              actor.role === "super_admin"
                ? [
                    "Time",
                    "Administrator",
                    "Action",
                    "Target",
                    "Reason",
                    "Request metadata",
                  ]
                : ["Time", "Administrator", "Action", "Target", "Reason"]
            }
          />
        }
      >
        {data.rows.length ? (
          <>
            <AdminTable id="admin-audit-table">
              <AdminTableHead>
                <AdminTh>Time</AdminTh>
                <AdminTh>Administrator</AdminTh>
                <AdminTh>Action</AdminTh>
                <AdminTh>Target</AdminTh>
                <AdminTh>Reason</AdminTh>
                {actor.role === "super_admin" ? (
                  <AdminTh>Request metadata</AdminTh>
                ) : null}
              </AdminTableHead>
              <tbody>
                {data.rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-black/[0.018]">
                    <AdminTd>
                      <span className="text-xs whitespace-nowrap">
                        {new Date(String(entry.created_at)).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <p className="font-mono text-xs">
                        {String(entry.administrator_id || "system").slice(
                          0,
                          12,
                        )}
                      </p>
                      <div className="mt-1">
                        <AdminStatusBadge
                          status={String(entry.administrator_role)}
                        />
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <span className="font-mono text-xs font-black">
                        {String(entry.action)}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <p className="font-bold">
                        {String(entry.target_entity_type)}
                      </p>
                      <p className="mt-1 max-w-32 truncate font-mono text-[11px] text-black/40">
                        {String(entry.target_entity_id || "")}
                      </p>
                    </AdminTd>
                    <AdminTd>
                      <p className="max-w-sm text-xs leading-5 text-black/55">
                        {String(entry.reason)}
                      </p>
                    </AdminTd>
                    {actor.role === "super_admin" ? (
                      <AdminTd>
                        <details>
                          <summary className="cursor-pointer text-xs font-black">
                            View redacted JSON
                          </summary>
                          <pre className="mt-2 max-h-48 max-w-md overflow-auto rounded bg-ink p-3 text-[10px] leading-5 text-white/70">
                            {JSON.stringify(
                              {
                                request_metadata: entry.request_metadata,
                                ip_address: entry.ip_address,
                                user_agent: entry.user_agent,
                                previous: entry.previous_value_redacted,
                                next: entry.new_value_redacted,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      </AdminTd>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </AdminTable>
            <AdminPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              pathname="/admin/audit-logs"
              query={{
                action: params.action,
                entity: params.entity,
                administrator: params.administrator,
                from: params.from,
                to: params.to,
                direction: params.direction,
              }}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={FileClock}
            title="No audit events found"
            description="No append-only events match the current filters."
          />
        )}
      </AdminPanel>
    </>
  );
}
