import type { Metadata } from "next";
import { BrainCircuit, Search } from "lucide-react";
import Link from "next/link";
import { AdminNotice } from "@/components/admin/admin-actions";
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
import { getAnalysesData } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Analyses" };

interface AnalysisSearchParams {
  q?: string;
  page?: string;
  status?: string;
  provider?: string;
  model?: string;
  confidence?: string;
  from?: string;
  to?: string;
  sort?: string;
  direction?: "asc" | "desc";
  admin_result?: string;
  admin_message?: string;
}

function duration(value: number | null) {
  if (value == null) return "Not recorded";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} sec`;
}

export default async function AdminAnalysesPage({
  searchParams,
}: {
  searchParams: Promise<AnalysisSearchParams>;
}) {
  const params = await searchParams;
  const result = await getAnalysesData({
    page: Number(params.page || 1),
    query: params.q,
    status: params.status,
    provider: params.provider,
    model: params.model,
    confidence: params.confidence,
    from: params.from,
    to: params.to,
    sort: params.sort,
    direction: params.direction,
  });
  return (
    <>
      <AdminPageHeader
        eyebrow="Quality operations"
        title="Analysis queue"
        description="Inspect processing state, model configuration, parsing quality, uncertainty, and redacted failures. Original provider output is preserved when corrections are added."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <AdminPanel
        className="mt-6"
        title="Filter analyses"
        description="Search by analysis ID or user name/email."
      >
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"
          method="get"
        >
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search analyses</span>
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-black/35" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Analysis ID or user"
              className="min-h-11 w-full rounded-md border border-black/10 pr-3 pl-10 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select
              name="status"
              defaultValue={params.status || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="flagged">Flagged</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Provider</span>
            <input
              name="provider"
              defaultValue={params.provider}
              placeholder="Provider"
              className="min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Model version</span>
            <input
              name="model"
              defaultValue={params.model}
              placeholder="Model version"
              className="min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Confidence band</span>
            <select
              name="confidence"
              defaultValue={params.confidence || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">Any confidence</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select
              name="sort"
              defaultValue={params.sort || "created"}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="created">Created time</option>
              <option value="duration">Processing duration</option>
            </select>
          </label>
          <button className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white">
            Apply filters
          </button>
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Created from
            </span>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Created to
            </span>
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
        </form>
      </AdminPanel>
      <AdminPanel
        className="mt-4"
        title={`${result.total.toLocaleString()} analyses`}
        action={
          <AdminColumnVisibility
            tableId="admin-analyses-table"
            columns={[
              "Analysis",
              "User",
              "Status",
              "Provider / model",
              "Matches",
              "Confidence",
              "Duration",
              "Review",
              "Action",
            ]}
          />
        }
      >
        {result.rows.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {result.rows.map((analysis) => (
                <Link
                  href={`/admin/analyses/${analysis.id}`}
                  key={analysis.id}
                  className="rounded-lg border border-black/10 p-4 hover:border-black/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-black">
                        {analysis.id}
                      </p>
                      <p className="mt-2 text-sm font-black">
                        {analysis.userName}
                      </p>
                    </div>
                    <AdminStatusBadge status={analysis.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-black/40">Provider</dt>
                      <dd className="mt-1 font-bold">{analysis.provider}</dd>
                    </div>
                    <div>
                      <dt className="text-black/40">Confidence</dt>
                      <dd className="mt-1 font-bold capitalize">
                        {analysis.confidence || "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-black/40">Matches</dt>
                      <dd className="mt-1 font-bold">{analysis.matchCount}</dd>
                    </div>
                    <div>
                      <dt className="text-black/40">Duration</dt>
                      <dd className="mt-1 font-bold">
                        {duration(analysis.durationMs)}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <AdminTable id="admin-analyses-table">
                <AdminTableHead>
                  <AdminTh>Analysis</AdminTh>
                  <AdminTh>User</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Provider / model</AdminTh>
                  <AdminTh>Matches</AdminTh>
                  <AdminTh>Confidence</AdminTh>
                  <AdminTh>Duration</AdminTh>
                  <AdminTh>Review</AdminTh>
                  <AdminTh>Action</AdminTh>
                </AdminTableHead>
                <tbody>
                  {result.rows.map((analysis) => (
                    <tr key={analysis.id} className="hover:bg-black/[0.018]">
                      <AdminTd>
                        <p className="font-mono text-xs font-black">
                          {analysis.id.slice(0, 8)}…
                        </p>
                        <p className="mt-1 text-[11px] text-black/40">
                          {new Date(analysis.createdAt).toLocaleString()}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <p className="font-bold">{analysis.userName}</p>
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={analysis.status} />
                        {analysis.errorCode ? (
                          <p className="mt-1 text-[11px] text-alert">
                            {analysis.errorCode}
                          </p>
                        ) : null}
                      </AdminTd>
                      <AdminTd>
                        <p className="font-bold">{analysis.provider}</p>
                        <p className="mt-1 max-w-40 truncate text-[11px] text-black/40">
                          {analysis.model || "Not recorded"}
                        </p>
                      </AdminTd>
                      <AdminTd>{analysis.matchCount}</AdminTd>
                      <AdminTd>
                        {analysis.confidence ? (
                          <AdminStatusBadge status={analysis.confidence} />
                        ) : (
                          "Not recorded"
                        )}
                      </AdminTd>
                      <AdminTd>{duration(analysis.durationMs)}</AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={analysis.reviewStatus} />
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/analyses/${analysis.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-black/10 px-3 text-xs font-black hover:bg-black/5"
                        >
                          Inspect
                        </Link>
                      </AdminTd>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </div>
            <AdminPagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              pathname="/admin/analyses"
              query={{
                q: params.q,
                status: params.status,
                provider: params.provider,
                model: params.model,
                confidence: params.confidence,
                from: params.from,
                to: params.to,
                sort: params.sort,
                direction: params.direction,
              }}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={params.q || params.status ? Search : BrainCircuit}
            title="No analyses found"
            description="No analysis records match the current server-side filters."
          />
        )}
      </AdminPanel>
    </>
  );
}
