import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Boxes,
  Clock3,
  Info,
  MousePointerClick,
  Search,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { SubAdminReferralCard } from "@/components/referrals/sub-admin-referral-card";
import { SubAdminShell } from "@/components/referrals/sub-admin-shell";
import {
  ReferralPanel,
  ReferralStatusBadge,
} from "@/components/referrals/referral-ui";
import { appConfig, referralConfig } from "@/lib/config";
import { getReferralPartnerDashboard } from "@/lib/referrals/data";
import { formatMinorCurrency } from "@/lib/referrals/money";
import type { ReferralCurrencySummary } from "@/lib/referrals/types";
import { getSubscriptionPlan } from "@/lib/subscriptions/plans";

export const metadata: Metadata = {
  title: "Sub-admin dashboard",
  description: "Private referral, commission, and payout workspace.",
};
export const dynamic = "force-dynamic";

interface ReferralSearchParams {
  q?: string;
  page?: string;
  status?: string;
  from?: string;
  to?: string;
}

const zeroFinancialSummary: ReferralCurrencySummary = {
  referredRevenueMinor: "0",
  referredProfitMinor: "0",
  commissionEarnedMinor: "0",
  superAdminShareMinor: "0",
  pendingCommissionMinor: "0",
  availableBalanceMinor: "0",
  totalPaidMinor: "0",
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function pageHref(params: ReferralSearchParams, page: number) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== "page") next.set(key, value);
  });
  next.set("page", String(page));
  return `/referrals?${next.toString()}#transactions`;
}

function SnapshotCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="referral-card referral-card-dark flex min-h-40 flex-col justify-between rounded-lg border border-white/12 bg-[#151517] p-6">
      <p className="text-xs font-black text-white/42 uppercase">{label}</p>
      <div className="mt-8">
        <p className="text-3xl leading-tight font-black break-words text-white tabular-nums">
          {value}
        </p>
        {detail ? (
          <p className="mt-2 text-xs leading-5 text-white/38">{detail}</p>
        ) : null}
      </div>
    </article>
  );
}

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<ReferralSearchParams>;
}) {
  const rawParams = await searchParams;
  const data = await getReferralPartnerDashboard(rawParams);
  const { rollup } = data;
  const pages = Math.max(1, Math.ceil(data.activityTotal / data.pageSize));
  const conversionRate = rollup.referredRegistrations
    ? (rollup.payingCustomers / rollup.referredRegistrations) * 100
    : 0;
  const financialEntries = Object.entries(rollup.financials);
  const displayEntries = financialEntries.length
    ? financialEntries
    : [[appConfig.currency, zeroFinancialSummary] as const];
  const primaryCurrency = rollup.financials[appConfig.currency]
    ? appConfig.currency
    : displayEntries[0][0];
  const primarySummary =
    rollup.financials[primaryCurrency] || zeroFinancialSummary;
  const currencySummaries = displayEntries.map(([currency, summary]) => {
    const available = BigInt(summary.availableBalanceMinor);
    return {
      currency,
      referredRevenue: formatMinorCurrency(
        summary.referredRevenueMinor,
        currency,
      ),
      commissionEarned: formatMinorCurrency(
        summary.commissionEarnedMinor,
        currency,
      ),
      pendingCommission: formatMinorCurrency(
        summary.pendingCommissionMinor,
        currency,
      ),
      availableBalance: formatMinorCurrency(
        available > BigInt(0) ? available : BigInt(0),
        currency,
      ),
      totalPaid: formatMinorCurrency(summary.totalPaidMinor, currency),
      recoverableBalance: formatMinorCurrency(
        available < BigInt(0) ? -available : BigInt(0),
        currency,
      ),
    };
  });

  return (
    <SubAdminShell
      user={data.user}
      clientCount={rollup.referredRegistrations}
      payingClientCount={rollup.payingCustomers}
      transactionCount={rollup.successfulTransactions}
    >
      <div id="overview" className="scroll-mt-6">
        {data.preview ? (
          <div
            className="referral-notice referral-entrance mb-6 flex items-start gap-3 rounded-lg border border-signal/25 bg-signal/8 px-4 py-4 text-sm text-white/68"
            role="status"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-signal/25 bg-signal/10 text-signal">
              <Info className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-black text-signal">
                Demo data · Local sub-admin test account
              </p>
              <p className="mt-1 leading-6">
                All figures are intentionally zero and the referral link is
                disabled until Supabase is connected.
              </p>
            </div>
          </div>
        ) : null}

        <SubAdminReferralCard
          code={rollup.referralCode}
          url={data.referralUrl}
          enabled={
            rollup.referralEnabled &&
            rollup.referralOperational &&
            Boolean(referralConfig.attributionSecret)
          }
          clientCount={rollup.referredRegistrations}
          payingClientCount={rollup.payingCustomers}
          attributionDays={referralConfig.attributionDays}
          commissionRateBasisPoints={rollup.commissionRateBasisPoints}
          currencySummaries={currencySummaries}
        />
      </div>

      <section
        id="audience"
        className="referral-metric-grid mt-6 grid scroll-mt-6 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Referral overview"
      >
        <SnapshotCard
          label="Clients"
          value={rollup.referredRegistrations.toLocaleString()}
          detail="Registered accounts retaining first attribution"
        />
        <SnapshotCard
          label="Paying clients"
          value={rollup.payingCustomers.toLocaleString()}
          detail="Customers with verified referred payments"
        />
        <SnapshotCard
          label={`Total revenue · ${primaryCurrency}`}
          value={formatMinorCurrency(
            primarySummary.referredRevenueMinor,
            primaryCurrency,
          )}
          detail="Gross verified referred revenue"
        />
        <SnapshotCard
          label="Recent transactions · 30 days"
          value={data.recentTransactions30Days.toLocaleString()}
          detail="Verified referred payments during the last 30 days"
        />
      </section>

      <section className="referral-panel mt-6 overflow-hidden rounded-lg border border-white/10 bg-[#151517]">
        <div className="border-b border-white/9 px-5 py-5 sm:px-7">
          <h2 className="text-lg font-black">Referral reach</h2>
          <p className="mt-1 text-xs text-white/40">
            Privacy-safe engagement and conversion totals.
          </p>
        </div>
        <dl className="grid gap-px bg-white/8 sm:grid-cols-3">
          {[
            {
              label: "Link clicks",
              value: rollup.totalClicks.toLocaleString(),
              icon: MousePointerClick,
            },
            {
              label: "Unique visitors",
              value: rollup.uniqueVisitors.toLocaleString(),
              icon: UsersRound,
            },
            {
              label: "Conversion rate",
              value: `${conversionRate.toFixed(1)}%`,
              icon: TrendingUp,
            },
          ].map((item) => (
            <div key={item.label} className="bg-[#151517] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-black text-white/42 uppercase">
                <item.icon className="size-4 text-signal" aria-hidden="true" />
                <dt>{item.label}</dt>
              </div>
              <dd className="mt-4 text-2xl font-black tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10" aria-labelledby="package-analytics-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-signal uppercase">
              Plan performance
            </p>
            <h2
              id="package-analytics-title"
              className="mt-2 text-2xl font-black"
            >
              Package analytics
            </h2>
          </div>
          <Boxes className="size-5 text-white/30" aria-hidden="true" />
        </div>

        {data.packageAnalytics.length ? (
          <div className="referral-metric-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.packageAnalytics.map((item) => {
              const plan = getSubscriptionPlan(item.productCode);
              return (
                <article
                  key={`${item.productCode}-${item.currency}`}
                  className="referral-card referral-card-dark min-h-52 rounded-lg border border-white/12 bg-[#151517] p-6"
                >
                  <p className="text-lg font-black text-signal capitalize">
                    {plan?.name || item.productCode.replaceAll("_", " ")}
                  </p>
                  <dl className="mt-7 grid gap-5">
                    <div>
                      <dt className="text-sm text-white/45">Count</dt>
                      <dd className="mt-1 text-2xl font-black tabular-nums">
                        {item.count.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-white/45">Revenue</dt>
                      <dd className="mt-1 text-xl font-black tabular-nums">
                        {formatMinorCurrency(item.revenueMinor, item.currency)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="referral-empty referral-panel grid min-h-48 place-items-center rounded-lg border border-white/10 bg-[#151517] px-5 py-10 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-white/35">
                <Boxes className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-black">
                No package activity yet
              </h3>
              <p className="mt-2 text-xs text-white/38">
                Verified Gold, Platinum, and Diamond purchases will appear here.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="referral-panel mt-8 overflow-hidden rounded-lg border border-white/10 bg-[#151517]">
        <div className="border-b border-white/9 px-5 py-5 text-center sm:px-7">
          <h2 className="text-sm font-black text-white/52 uppercase">
            Transaction status breakdown
          </h2>
        </div>
        <dl className="grid grid-cols-3 gap-px bg-white/8 text-center">
          {[
            {
              label: "Failed",
              value: data.paymentStatus.failed,
              className: "text-rose-300",
            },
            {
              label: "Completed",
              value: data.paymentStatus.completed,
              className: "text-emerald-300",
            },
            {
              label: "Pending",
              value: data.paymentStatus.pending,
              className: "text-signal",
            },
          ].map((item) => (
            <div key={item.label} className="bg-[#151517] px-2 py-7 sm:p-8">
              <dt className={`text-sm font-black sm:text-lg ${item.className}`}>
                {item.label}
              </dt>
              <dd className="mt-4 text-3xl font-black tabular-nums sm:text-4xl">
                {item.value.toLocaleString()}
              </dd>
              <p className="mt-1 text-[11px] text-white/35 sm:text-xs">
                transactions
              </p>
            </div>
          ))}
        </dl>
      </section>

      <div id="transactions" className="mt-10 scroll-mt-6">
        <ReferralPanel
          title="Referral transactions"
          description="Verified earnings, refunds, chargebacks, and manual adjustments."
          action={
            <span className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-white/[0.035] px-2.5 text-xs font-black text-white/45">
              {data.activityTotal.toLocaleString()} entries
            </span>
          }
        >
          <form
            className="grid gap-3 border-b border-white/10 bg-white/[0.012] p-4 sm:grid-cols-2 lg:grid-cols-5"
            method="get"
          >
            <label className="relative lg:col-span-2">
              <span className="sr-only">Search activity</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/30"
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={data.query.q}
                placeholder="Transaction or package"
                className="referral-control min-h-11 w-full rounded-lg border border-white/12 bg-black pr-3 pl-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-signal focus:ring-2 focus:ring-signal/10"
              />
            </label>
            <label>
              <span className="sr-only">Status</span>
              <select
                name="status"
                defaultValue={data.query.status}
                className="referral-control min-h-11 w-full rounded-lg border border-white/12 bg-black px-3 text-sm text-white outline-none focus:border-signal focus:ring-2 focus:ring-signal/10"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="available">Available</option>
                <option value="paid">Paid</option>
                <option value="reversed">Reversed</option>
                <option value="adjusted">Adjusted</option>
              </select>
            </label>
            <label>
              <span className="sr-only">From date</span>
              <input
                type="date"
                name="from"
                defaultValue={data.query.from}
                className="referral-control min-h-11 w-full rounded-lg border border-white/12 bg-black px-3 text-sm text-white outline-none focus:border-signal focus:ring-2 focus:ring-signal/10"
              />
            </label>
            <label>
              <span className="sr-only">To date</span>
              <input
                type="date"
                name="to"
                defaultValue={data.query.to}
                className="referral-control min-h-11 w-full rounded-lg border border-white/12 bg-black px-3 text-sm text-white outline-none focus:border-signal focus:ring-2 focus:ring-signal/10"
              />
            </label>
            <button className="referral-interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-signal px-4 text-sm font-black text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal lg:col-start-5">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Apply filters
            </button>
          </form>

          {data.activity.length ? (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {data.activity.map((entry) => (
                  <article
                    key={entry.id}
                    className="referral-mobile-row rounded-lg border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {entry.customerDisplayName}
                        </p>
                        <p className="mt-1 text-xs text-white/38">
                          {entry.customerEmail}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <ReferralStatusBadge status={entry.entryType} dark />
                        <ReferralStatusBadge status={entry.status} dark />
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-white/38">Payment</dt>
                        <dd className="mt-1 font-black">
                          {formatMinorCurrency(
                            entry.grossAmountMinor,
                            entry.currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/38">Commission</dt>
                        <dd className="mt-1 font-black text-signal">
                          {formatMinorCurrency(
                            entry.subAdminAmountMinor,
                            entry.currency,
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 font-mono text-[11px] text-white/35">
                      {entry.paymentReference}
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1180px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[0.025] text-[10px] text-white/38 uppercase">
                    <tr>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Customer</th>
                      <th className="px-4 py-3.5">Transaction</th>
                      <th className="px-4 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Payment</th>
                      <th className="px-4 py-3.5">Net profit</th>
                      <th className="px-4 py-3.5">Commission</th>
                      <th className="px-4 py-3.5">Entry type</th>
                      <th className="px-4 py-3.5">Refund</th>
                      <th className="px-4 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activity.map((entry) => (
                      <tr
                        key={entry.id}
                        className="referral-table-row border-b border-white/7 last:border-0"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-white/52">
                          {dateTime(entry.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black">
                            {entry.customerDisplayName}
                          </p>
                          <p className="mt-1 text-white/35">
                            {entry.customerEmail}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px] text-white/48">
                          {entry.paymentReference}
                        </td>
                        <td className="px-4 py-4 text-white/62 capitalize">
                          {entry.productCode || entry.sourcePaymentType}
                        </td>
                        <td className="px-4 py-4 font-black">
                          {formatMinorCurrency(
                            entry.grossAmountMinor,
                            entry.currency,
                          )}
                        </td>
                        <td className="px-4 py-4 text-white/62">
                          {formatMinorCurrency(
                            entry.netProfitMinor,
                            entry.currency,
                          )}
                        </td>
                        <td className="px-4 py-4 font-black text-signal">
                          {formatMinorCurrency(
                            entry.subAdminAmountMinor,
                            entry.currency,
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <ReferralStatusBadge status={entry.entryType} dark />
                        </td>
                        <td className="px-4 py-4 text-white/62">
                          {formatMinorCurrency(
                            entry.refundAmountMinor,
                            entry.currency,
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <ReferralStatusBadge status={entry.status} dark />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/42">
                <span>
                  Page {data.page} of {pages}
                </span>
                <div className="flex gap-2">
                  <Link
                    aria-disabled={data.page <= 1}
                    href={pageHref(rawParams, Math.max(1, data.page - 1))}
                    className={`referral-interactive inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 px-3 font-bold ${data.page <= 1 ? "pointer-events-none opacity-35" : "hover:bg-white/6"}`}
                  >
                    <ArrowLeft className="size-3.5" /> Previous
                  </Link>
                  <Link
                    aria-disabled={data.page >= pages}
                    href={pageHref(rawParams, Math.min(pages, data.page + 1))}
                    className={`referral-interactive inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 px-3 font-bold ${data.page >= pages ? "pointer-events-none opacity-35" : "hover:bg-white/6"}`}
                  >
                    Next <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-48 place-items-center px-5 py-10 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-white/35">
                  <Activity className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-black">
                  No matching transactions
                </h3>
                <p className="mt-2 text-xs text-white/38">
                  Verified referral ledger entries will appear here.
                </p>
              </div>
            </div>
          )}
        </ReferralPanel>
      </div>

      <div className="mt-6">
        <ReferralPanel
          title="Payout history"
          description="Read-only records of money sent externally and allocated by the super-admin."
        >
          {data.payouts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] text-white/38 uppercase">
                  <tr>
                    <th className="px-4 py-3.5">Payout date</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Method</th>
                    <th className="px-4 py-3.5">Reference</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="referral-table-row border-b border-white/7 last:border-0"
                    >
                      <td className="px-4 py-4 text-white/52">
                        {dateTime(payout.payoutDate)}
                      </td>
                      <td className="px-4 py-4 font-black">
                        {formatMinorCurrency(
                          payout.amountMinor,
                          payout.currency,
                        )}
                      </td>
                      <td className="px-4 py-4 text-white/62">
                        {payout.paymentMethod}
                      </td>
                      <td className="px-4 py-4 font-mono text-white/48">
                        {payout.externalReference}
                      </td>
                      <td className="px-4 py-4">
                        <ReferralStatusBadge status={payout.status} dark />
                      </td>
                      <td className="max-w-64 truncate px-4 py-4 text-white/42">
                        {payout.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center px-5 py-10 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-white/35">
                  <Banknote className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-black">No payouts recorded</h3>
                <p className="mt-2 text-xs text-white/38">
                  Payouts appear after the super-admin records an external
                  payment.
                </p>
              </div>
            </div>
          )}
        </ReferralPanel>
      </div>

      <aside className="mt-8 flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-5 text-sm leading-6 text-white/52">
        <Clock3
          className="mt-0.5 size-5 shrink-0 text-signal"
          aria-hidden="true"
        />
        Pending commission is not available for payout until its configured hold
        period has ended. All displayed balances come directly from the
        immutable referral ledger and recorded payout allocations.
      </aside>
    </SubAdminShell>
  );
}
