import type { Metadata } from "next";
import {
  Activity,
  Banknote,
  CircleDollarSign,
  HandCoins,
  MousePointerClick,
  Percent,
  ReceiptText,
  Search,
  ShieldOff,
  TrendingUp,
  UserCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  AdminActionDialog,
  AdminNotice,
} from "@/components/admin/admin-actions";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminStatusBadge,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from "@/components/admin/admin-ui";
import { ReferralProfileAction } from "@/components/referrals/referral-admin-actions";
import { ReferralStatusBadge } from "@/components/referrals/referral-ui";
import { appConfig } from "@/lib/config";
import { getReferralAdminDashboard } from "@/lib/referrals/data";
import { formatMinorCurrency } from "@/lib/referrals/money";

export const metadata: Metadata = { title: "Referral Partners" };

interface SearchParams {
  q?: string;
  page?: string;
  partnerStatus?: string;
  sort?: string;
  direction?: "asc" | "desc";
  from?: string;
  to?: string;
  admin_result?: string;
  admin_message?: string;
}

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getReferralAdminDashboard(params);
  const preserved = {
    q: params.q,
    partnerStatus: params.partnerStatus,
    sort: params.sort,
    direction: params.direction,
    from: params.from,
    to: params.to,
  };
  const preferredCurrency = appConfig.currency;

  return (
    <>
      <AdminPageHeader
        eyebrow="Partner accounting"
        title="Referral partners"
        description="Super-admin-only oversight of sub-admin attribution, verified commission, reversals, recoverable balances, and externally recorded payouts. Paystack funds remain in the platform account."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />

      <section
        className="admin-metric-grid mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Referral overview"
      >
        <AdminMetricCard
          label="Total sub-admins"
          value={data.overview.totalSubAdmins.toLocaleString()}
          detail={`${data.overview.activeSubAdmins} active`}
          icon={UsersRound}
        />
        <AdminMetricCard
          label="Suspended or disabled"
          value={data.overview.suspendedSubAdmins.toLocaleString()}
          detail="Not accepting qualifying referrals"
          icon={ShieldOff}
          tone={data.overview.suspendedSubAdmins ? "warning" : "default"}
        />
        <AdminMetricCard
          label="Referral clicks"
          value={data.overview.totalClicks.toLocaleString()}
          detail={`${data.overview.uniqueVisitors} unique visitors`}
          icon={MousePointerClick}
        />
        <AdminMetricCard
          label="Referred registrations"
          value={data.overview.referredRegistrations.toLocaleString()}
          detail="Permanent first-touch accounts"
          icon={UserRoundPlus}
        />
        <AdminMetricCard
          label="Paying customers"
          value={data.overview.payingCustomers.toLocaleString()}
          detail="Unique verified referred payers"
          icon={UserCheck}
          tone="success"
        />
        <AdminMetricCard
          label="Referred payments"
          value={data.overview.referredPayments.toLocaleString()}
          detail="Signup and plan transactions"
          icon={ReceiptText}
        />
      </section>

      {Object.entries(data.overview.financials).map(([currency, summary]) => {
        const available = BigInt(summary.availableBalanceMinor);
        const owed = available > BigInt(0) ? available : BigInt(0);
        const recoverable = available < BigInt(0) ? -available : BigInt(0);
        return (
          <section
            key={currency}
            className="mt-6"
            aria-label={`${currency} referral totals`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-signal">
                {currency}
              </span>
              <p className="text-xs text-black/45">
                Currency totals are never combined.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard
                label="Referred revenue"
                value={formatMinorCurrency(
                  summary.referredRevenueMinor,
                  currency,
                )}
                icon={CircleDollarSign}
              />
              <AdminMetricCard
                label="Referred profit"
                value={formatMinorCurrency(
                  summary.referredProfitMinor,
                  currency,
                )}
                icon={TrendingUp}
              />
              <AdminMetricCard
                label="Sub-admin commission"
                value={formatMinorCurrency(
                  summary.subAdminCommissionMinor,
                  currency,
                )}
                icon={HandCoins}
                tone="success"
              />
              <AdminMetricCard
                label="Super-admin share"
                value={formatMinorCurrency(
                  summary.superAdminShareMinor,
                  currency,
                )}
                icon={Percent}
              />
              <AdminMetricCard
                label="Pending commission"
                value={formatMinorCurrency(
                  summary.pendingCommissionMinor,
                  currency,
                )}
                icon={Activity}
                tone="warning"
              />
              <AdminMetricCard
                label="Available amount owed"
                value={formatMinorCurrency(owed, currency)}
                detail="Payable positive balance"
                icon={Banknote}
                tone="success"
              />
              <AdminMetricCard
                label="Total recorded paid"
                value={formatMinorCurrency(summary.totalPaidMinor, currency)}
                icon={ReceiptText}
              />
              <AdminMetricCard
                label="Recoverable balance"
                value={formatMinorCurrency(recoverable, currency)}
                detail="Offsets future earnings"
                icon={ShieldOff}
                tone={recoverable > BigInt(0) ? "danger" : "default"}
              />
            </div>
          </section>
        );
      })}

      <AdminPanel
        className="mt-6"
        title="Find referral partners"
        description="Search, filtering, sorting, and pagination run on the server."
      >
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7"
          method="get"
        >
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search partners</span>
            <Search
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-black/35"
              aria-hidden="true"
            />
            <input
              name="q"
              defaultValue={data.query.q}
              placeholder="Name, email, or code"
              className="min-h-11 w-full rounded-md border border-black/10 bg-white pr-3 pl-10 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Partner status</span>
            <select
              name="partnerStatus"
              defaultValue={data.query.partnerStatus}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Referral disabled</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort field</span>
            <select
              name="sort"
              defaultValue={data.query.sort}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="created">Created date</option>
              <option value="name">Name</option>
              <option value="clicks">Clicks</option>
              <option value="transactions">Transactions</option>
              <option value="activity">Recent activity</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort direction</span>
            <select
              name="direction"
              defaultValue={data.query.direction}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Created from</span>
            <input
              type="date"
              name="from"
              defaultValue={data.query.from}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Created to</span>
            <input
              type="date"
              name="to"
              defaultValue={data.query.to}
              className="min-h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm"
            />
          </label>
          <button className="admin-interactive min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white xl:col-start-7">
            Apply filters
          </button>
        </form>
      </AdminPanel>

      <AdminPanel
        className="mt-4"
        title={`${data.total.toLocaleString()} referral partners`}
      >
        {data.partners.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {data.partners.map((partner) => {
                const summary = partner.financials[preferredCurrency];
                return (
                  <Link
                    key={partner.id}
                    href={`/admin/referrals/${partner.id}`}
                    className="rounded-lg border border-black/10 p-4 hover:border-black/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {partner.displayName}
                        </p>
                        <p className="mt-1 truncate text-xs text-black/42">
                          {partner.email}
                        </p>
                      </div>
                      <AdminStatusBadge
                        status={
                          partner.referralOperational
                            ? "active"
                            : partner.accountStatus
                        }
                      />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-black/38">Clicks</dt>
                        <dd className="mt-1 font-black">
                          {partner.totalClicks}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-black/38">Customers</dt>
                        <dd className="mt-1 font-black">
                          {partner.payingCustomers}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-black/38">Owed</dt>
                        <dd className="mt-1 font-black">
                          {summary
                            ? formatMinorCurrency(
                                BigInt(summary.availableBalanceMinor) >
                                  BigInt(0)
                                  ? summary.availableBalanceMinor
                                  : "0",
                                preferredCurrency,
                              )
                            : `${preferredCurrency} 0.00`}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                );
              })}
            </div>
            <div className="hidden md:block">
              <AdminTable>
                <AdminTableHead>
                  <AdminTh>Sub-admin</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Referral code</AdminTh>
                  <AdminTh>Clicks</AdminTh>
                  <AdminTh>Registrations</AdminTh>
                  <AdminTh>Paying</AdminTh>
                  <AdminTh>Transactions</AdminTh>
                  <AdminTh>Revenue</AdminTh>
                  <AdminTh>Net profit</AdminTh>
                  <AdminTh>Commission</AdminTh>
                  <AdminTh>Pending</AdminTh>
                  <AdminTh>Available owed</AdminTh>
                  <AdminTh>Total paid</AdminTh>
                  <AdminTh>Recoverable</AdminTh>
                  <AdminTh>Last activity</AdminTh>
                  <AdminTh>Created</AdminTh>
                  <AdminTh>Action</AdminTh>
                </AdminTableHead>
                <tbody>
                  {data.partners.map((partner) => {
                    const summary = partner.financials[preferredCurrency];
                    const balance = BigInt(
                      summary?.availableBalanceMinor || "0",
                    );
                    return (
                      <tr key={partner.id}>
                        <AdminTd className="min-w-56">
                          <p className="font-black">{partner.displayName}</p>
                          <p className="mt-1 truncate text-xs text-black/42">
                            {partner.email}
                          </p>
                        </AdminTd>
                        <AdminTd>
                          <div className="flex flex-col items-start gap-1.5">
                            <AdminStatusBadge
                              status={
                                partner.referralOperational
                                  ? "active"
                                  : partner.accountStatus
                              }
                            />
                            <ReferralStatusBadge
                              status={
                                partner.referralEnabled &&
                                partner.referralOperational
                                  ? "active"
                                  : "disabled"
                              }
                            />
                          </div>
                        </AdminTd>
                        <AdminTd>
                          <code className="text-xs font-bold">
                            {partner.referralCode}
                          </code>
                        </AdminTd>
                        <AdminTd>{partner.totalClicks}</AdminTd>
                        <AdminTd>{partner.referredRegistrations}</AdminTd>
                        <AdminTd>{partner.payingCustomers}</AdminTd>
                        <AdminTd>{partner.successfulTransactions}</AdminTd>
                        <AdminTd>
                          {summary
                            ? formatMinorCurrency(
                                summary.referredRevenueMinor,
                                preferredCurrency,
                              )
                            : `${preferredCurrency} 0.00`}
                        </AdminTd>
                        <AdminTd>
                          {summary
                            ? formatMinorCurrency(
                                summary.referredProfitMinor,
                                preferredCurrency,
                              )
                            : `${preferredCurrency} 0.00`}
                        </AdminTd>
                        <AdminTd>
                          {summary
                            ? formatMinorCurrency(
                                summary.commissionEarnedMinor,
                                preferredCurrency,
                              )
                            : `${preferredCurrency} 0.00`}
                        </AdminTd>
                        <AdminTd>
                          {summary
                            ? formatMinorCurrency(
                                summary.pendingCommissionMinor,
                                preferredCurrency,
                              )
                            : `${preferredCurrency} 0.00`}
                        </AdminTd>
                        <AdminTd
                          className={
                            balance < BigInt(0)
                              ? "font-black text-alert"
                              : "font-black"
                          }
                        >
                          {formatMinorCurrency(
                            balance > BigInt(0) ? balance : BigInt(0),
                            preferredCurrency,
                          )}
                        </AdminTd>
                        <AdminTd>
                          {summary
                            ? formatMinorCurrency(
                                summary.totalPaidMinor,
                                preferredCurrency,
                              )
                            : `${preferredCurrency} 0.00`}
                        </AdminTd>
                        <AdminTd
                          className={
                            balance < BigInt(0) ? "font-black text-alert" : ""
                          }
                        >
                          {formatMinorCurrency(
                            balance < BigInt(0) ? -balance : BigInt(0),
                            preferredCurrency,
                          )}
                        </AdminTd>
                        <AdminTd>
                          {partner.lastReferralActivityAt
                            ? new Date(
                                partner.lastReferralActivityAt,
                              ).toLocaleDateString()
                            : "No activity"}
                        </AdminTd>
                        <AdminTd>
                          {new Date(partner.createdAt).toLocaleDateString()}
                        </AdminTd>
                        <AdminTd>
                          <div className="flex min-w-64 flex-wrap gap-2">
                            <Link
                              href={`/admin/referrals/${partner.id}`}
                              className="inline-flex min-h-9 items-center rounded-full border border-black/10 px-3 text-xs font-black hover:bg-black/5"
                            >
                              View details
                            </Link>
                            <ReferralProfileAction
                              referralProfileId={partner.id}
                              operation={
                                partner.referralEnabled ? "disable" : "enable"
                              }
                              enabled={partner.referralEnabled}
                              returnTo="/admin/referrals"
                            />
                            {partner.accountStatus === "active" ? (
                              <AdminActionDialog
                                kind="user_suspend"
                                targetId={partner.userId}
                                label="Suspend"
                                title="Suspend sub-admin"
                                description="New qualifying referral activity stops immediately while financial history remains intact."
                                tone="danger"
                              />
                            ) : partner.accountStatus === "suspended" ? (
                              <AdminActionDialog
                                kind="user_reactivate"
                                targetId={partner.userId}
                                label="Reactivate"
                                title="Reactivate sub-admin"
                                description="Restore account and referral eligibility after reviewing the suspension."
                                tone="success"
                              />
                            ) : null}
                          </div>
                        </AdminTd>
                      </tr>
                    );
                  })}
                </tbody>
              </AdminTable>
            </div>
            <AdminPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              pathname="/admin/referrals"
              query={preserved}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={Search}
            title="No referral partners found"
            description="Promote a user to the sub-admin role to generate a secure referral profile automatically."
          />
        )}
      </AdminPanel>
    </>
  );
}
