import type { Metadata } from "next";
import { MessageSquareText, Search } from "lucide-react";
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
import { getReviewsData } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    from?: string;
    to?: string;
    direction?: "asc" | "desc";
    admin_result?: string;
    admin_message?: string;
  }>;
}) {
  const params = await searchParams;
  const result = await getReviewsData({
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
        eyebrow="Moderation"
        title="Review queue"
        description="Approve genuine member submissions without rewriting text or changing ratings. Redactions are stored separately and every decision remains auditable."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <AdminPanel className="mt-6" title="Filter reviews">
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7"
          method="get"
        >
          <label className="relative sm:col-span-2">
            <span className="sr-only">Search review text</span>
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-black/35" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search original review text"
              className="min-h-11 w-full rounded-md border border-black/10 pr-3 pl-10 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Moderation status</span>
            <select
              name="status"
              defaultValue={params.status || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="hidden">Hidden</option>
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
        title={`${result.total.toLocaleString()} reviews`}
        action={
          <AdminColumnVisibility
            tableId="admin-reviews-table"
            columns={[
              "User",
              "Rating",
              "Original review",
              "Status",
              "Redacted",
              "Submitted",
              "Action",
            ]}
          />
        }
      >
        {result.rows.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {result.rows.map((review) => (
                <Link
                  href={`/admin/reviews/${review.id}`}
                  key={review.id}
                  className="rounded-lg border border-black/10 p-4 hover:border-black/25"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{review.rating} / 5</p>
                    <AdminStatusBadge status={review.status} />
                  </div>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-black/58">
                    {review.originalBody}
                  </p>
                  <p className="mt-3 text-xs font-bold">{review.userName}</p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <AdminTable id="admin-reviews-table">
                <AdminTableHead>
                  <AdminTh>User</AdminTh>
                  <AdminTh>Rating</AdminTh>
                  <AdminTh>Original review</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Redacted</AdminTh>
                  <AdminTh>Submitted</AdminTh>
                  <AdminTh>Action</AdminTh>
                </AdminTableHead>
                <tbody>
                  {result.rows.map((review) => (
                    <tr key={review.id} className="hover:bg-black/[0.018]">
                      <AdminTd>
                        <Link
                          href={`/admin/users/${review.userId}`}
                          className="font-bold hover:underline"
                        >
                          {review.userName}
                        </Link>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-black">{review.rating} / 5</span>
                      </AdminTd>
                      <AdminTd>
                        <p className="line-clamp-2 max-w-md text-xs leading-5 text-black/58">
                          {review.originalBody}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={review.status} />
                      </AdminTd>
                      <AdminTd>
                        {review.redactedBody ? "Separate redaction" : "No"}
                      </AdminTd>
                      <AdminTd>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/reviews/${review.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-black/10 px-3 text-xs font-black hover:bg-black/5"
                        >
                          Moderate
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
              pathname="/admin/reviews"
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
            icon={params.q || params.status ? Search : MessageSquareText}
            title="No reviews found"
            description="No genuine review submissions match the current filters."
          />
        )}
      </AdminPanel>
    </>
  );
}
