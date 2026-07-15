import type { Metadata } from "next";
import { Search, Trophy } from "lucide-react";
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
import { getWinRecordsData } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Win records" };

interface SearchParams {
  q?: string;
  page?: string;
  status?: string;
  from?: string;
  to?: string;
  direction?: "asc" | "desc";
  admin_result?: string;
  admin_message?: string;
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export default async function AdminWinRecordsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const result = await getWinRecordsData({
    page: Number(params.page || 1),
    query: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
    direction: params.direction,
  });
  return (
    <>
      <AdminPageHeader
        eyebrow="Verification"
        title="Win records"
        description="Genuine success records enter public activity only after evidence review, recorded consent, a privacy-safe name, and explicit publication. Demo records are always excluded."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <AdminPanel className="mt-6" title="Filter verification records">
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7"
          method="get"
        >
          <label className="relative sm:col-span-2">
            <span className="sr-only">Search record ID</span>
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-black/35" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Exact record ID"
              className="min-h-11 w-full rounded-md border border-black/10 pr-3 pl-10 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Verification status</span>
            <select
              name="status"
              defaultValue={params.status || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Submitted after</span>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Submitted before</span>
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
        title={`${result.total.toLocaleString()} win records`}
        action={
          <AdminColumnVisibility
            tableId="admin-wins-table"
            columns={[
              "Record",
              "User",
              "Claimed amount",
              "Status",
              "Consent",
              "Evidence",
              "Won",
              "Submitted",
              "Action",
            ]}
          />
        }
      >
        {result.rows.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {result.rows.map((record) => (
                <Link
                  key={record.id}
                  href={`/admin/win-records/${record.id}`}
                  className="rounded-lg border border-black/10 p-4 hover:border-black/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">
                        {money(record.amountMinor, record.currency)}
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {record.userName}
                      </p>
                    </div>
                    <AdminStatusBadge status={record.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-black/40">Consent</dt>
                      <dd className="mt-1 font-bold">
                        {record.consent ? "Recorded" : "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-black/40">Evidence</dt>
                      <dd className="mt-1 font-bold">
                        {record.hasEvidence ? "Private image" : "Missing"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <AdminTable id="admin-wins-table">
                <AdminTableHead>
                  <AdminTh>Record</AdminTh>
                  <AdminTh>User</AdminTh>
                  <AdminTh>Claimed amount</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Consent</AdminTh>
                  <AdminTh>Evidence</AdminTh>
                  <AdminTh>Won</AdminTh>
                  <AdminTh>Submitted</AdminTh>
                  <AdminTh>Action</AdminTh>
                </AdminTableHead>
                <tbody>
                  {result.rows.map((record) => (
                    <tr key={record.id} className="hover:bg-black/[0.018]">
                      <AdminTd>
                        <p className="font-mono text-xs font-black">
                          {record.id.slice(0, 8)}…
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/users/${record.userId}`}
                          className="font-bold hover:underline"
                        >
                          {record.userName}
                        </Link>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-black">
                          {money(record.amountMinor, record.currency)}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={record.status} />
                      </AdminTd>
                      <AdminTd>
                        {record.consent ? "Recorded" : "Missing"}
                      </AdminTd>
                      <AdminTd>
                        {record.hasEvidence ? "Private image" : "Missing"}
                      </AdminTd>
                      <AdminTd>
                        {new Date(record.wonAt).toLocaleDateString()}
                      </AdminTd>
                      <AdminTd>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/win-records/${record.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-black/10 px-3 text-xs font-black hover:bg-black/5"
                        >
                          Review
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
              pathname="/admin/win-records"
              query={{
                q: params.q,
                status: params.status,
                from: params.from,
                to: params.to,
                direction: params.direction,
              }}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={params.q || params.status ? Search : Trophy}
            title="No win records found"
            description="No verification records match the current filters."
          />
        )}
      </AdminPanel>
    </>
  );
}
