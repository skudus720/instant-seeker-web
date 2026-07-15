import type { Metadata } from "next";
import { Search, Users } from "lucide-react";
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
import { getUsersData } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Users" };

interface UsersSearchParams {
  q?: string;
  page?: string;
  role?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
  direction?: "asc" | "desc";
  activityFrom?: string;
  activityTo?: string;
  flagged?: string;
  rateLimited?: string;
  admin_result?: string;
  admin_message?: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<UsersSearchParams>;
}) {
  const params = await searchParams;
  const result = await getUsersData({
    page: Number(params.page || 1),
    query: params.q,
    role: params.role,
    status: params.status,
    from: params.from,
    to: params.to,
    sort: params.sort,
    direction: params.direction,
    activityFrom: params.activityFrom,
    activityTo: params.activityTo,
    flagged: params.flagged === "true",
    rateLimited: params.rateLimited === "true",
  });
  const preserved = {
    q: params.q,
    role: params.role,
    status: params.status,
    from: params.from,
    to: params.to,
    sort: params.sort,
    direction: params.direction,
    activityFrom: params.activityFrom,
    activityTo: params.activityTo,
    flagged: params.flagged,
    rateLimited: params.rateLimited,
  };
  return (
    <>
      <AdminPageHeader
        eyebrow="Accounts"
        title="Users"
        description="Search account activity, review safety history, and perform reasoned account actions. Passwords, tokens, and provider secrets are never available here."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <AdminPanel
        className="mt-6"
        title="Find users"
        description="Filters and pagination run on the server."
      >
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"
          method="get"
        >
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search users</span>
            <Search
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-black/35"
              aria-hidden="true"
            />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Name or email"
              className="min-h-11 w-full rounded-md border border-black/10 bg-white pr-3 pl-10 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
          </label>
          <label>
            <span className="sr-only">Role</span>
            <select
              name="role"
              defaultValue={params.role || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="sub_admin">Sub-admin</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Account status</span>
            <select
              name="status"
              defaultValue={params.status || ""}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deletion_pending">Deletion pending</option>
              <option value="anonymized">Anonymized</option>
              <option value="deleted">Deleted</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort users</span>
            <select
              name="sort"
              defaultValue={params.sort || "created"}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="created">Signup date</option>
              <option value="activity">Last active</option>
              <option value="name">Name</option>
              <option value="role">Role</option>
            </select>
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
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Signed up from
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
              Signed up to
            </span>
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Active from
            </span>
            <input
              type="date"
              name="activityFrom"
              defaultValue={params.activityFrom}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Active to
            </span>
            <input
              type="date"
              name="activityTo"
              defaultValue={params.activityTo}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Content flags
            </span>
            <select
              name="flagged"
              defaultValue={params.flagged || ""}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">Any content state</option>
              <option value="true">Flagged or rejected content</option>
            </select>
          </label>
          <label>
            <span className="text-[11px] font-bold text-black/42">
              Rate limits
            </span>
            <select
              name="rateLimited"
              defaultValue={params.rateLimited || ""}
              className="mt-1 min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">Any limit state</option>
              <option value="true">Has blocked limit event</option>
            </select>
          </label>
          <button className="min-h-11 self-end rounded-full bg-ink px-4 text-sm font-black text-white hover:bg-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            Apply filters
          </button>
        </form>
      </AdminPanel>

      <AdminPanel
        className="mt-4"
        title={`${result.total.toLocaleString()} users`}
        action={
          <AdminColumnVisibility
            tableId="admin-users-table"
            columns={[
              "User",
              "Role",
              "Status",
              "18+",
              "Last active",
              "Activity",
              "Joined",
              "Action",
            ]}
          />
        }
      >
        {result.rows.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {result.rows.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="rounded-lg border border-black/10 p-4 hover:border-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-ink text-xs font-black text-signal">
                      {initials(user.displayName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">
                        {user.displayName}
                      </p>
                      <p className="mt-1 truncate text-xs text-black/45">
                        {user.email}
                      </p>
                    </div>
                    <AdminStatusBadge status={user.accountStatus} />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-black/40">Analyses</dt>
                      <dd className="mt-1 font-black">{user.analysisCount}</dd>
                    </div>
                    <div>
                      <dt className="text-black/40">Reviews</dt>
                      <dd className="mt-1 font-black">{user.reviewCount}</dd>
                    </div>
                    <div>
                      <dt className="text-black/40">Wins</dt>
                      <dd className="mt-1 font-black">{user.winRecordCount}</dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <AdminTable id="admin-users-table">
                <AdminTableHead>
                  <AdminTh>User</AdminTh>
                  <AdminTh>Role</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>18+</AdminTh>
                  <AdminTh>Last active</AdminTh>
                  <AdminTh>Activity</AdminTh>
                  <AdminTh>Joined</AdminTh>
                  <AdminTh>Action</AdminTh>
                </AdminTableHead>
                <tbody>
                  {result.rows.map((user) => (
                    <tr key={user.id} className="hover:bg-black/[0.018]">
                      <AdminTd>
                        <div className="flex min-w-56 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-black text-signal">
                            {initials(user.displayName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-black">
                              {user.displayName}
                            </p>
                            <p className="mt-1 truncate text-xs text-black/45">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={user.role} />
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={user.accountStatus} />
                      </AdminTd>
                      <AdminTd>
                        {user.ageConfirmed ? "Confirmed" : "Not recorded"}
                      </AdminTd>
                      <AdminTd>
                        {user.lastActiveAt
                          ? new Date(user.lastActiveAt).toLocaleDateString()
                          : "No activity"}
                      </AdminTd>
                      <AdminTd>
                        <span className="whitespace-nowrap">
                          {user.analysisCount} A · {user.reviewCount} R ·{" "}
                          {user.winRecordCount} W
                        </span>
                      </AdminTd>
                      <AdminTd>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-black/10 px-3 text-xs font-black hover:bg-black/5"
                        >
                          Open
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
              pathname="/admin/users"
              query={preserved}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={params.q || params.role || params.status ? Search : Users}
            title="No users found"
            description="No account records match the current server-side filters."
          />
        )}
      </AdminPanel>
    </>
  );
}
