import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  Banknote,
  MousePointerClick,
  ReceiptText,
  UserCheck,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminActionDialog,
  AdminNotice,
} from "@/components/admin/admin-actions";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from "@/components/admin/admin-ui";
import {
  ReferralAdjustmentDialog,
  ReferralPayoutCancelAction,
  ReferralPayoutDialog,
  ReferralProfileAction,
} from "@/components/referrals/referral-admin-actions";
import { ReferralLinkCard } from "@/components/referrals/referral-link-card";
import { ReferralStatusBadge } from "@/components/referrals/referral-ui";
import { referralConfig } from "@/lib/config";
import { getReferralAdminDetails } from "@/lib/referrals/data";
import { formatMinorCurrency } from "@/lib/referrals/money";

export const metadata: Metadata = { title: "Referral partner details" };

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminReferralDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const details = await getReferralAdminDetails(id);
  if (!details) notFound();
  const { rollup } = details;
  const returnTo = `/admin/referrals/${rollup.id}`;
  const financialEntries = Object.entries(rollup.financials);
  const availableByCurrency = Object.fromEntries(
    financialEntries.map(([currency, summary]) => [
      currency,
      summary.availableBalanceMinor,
    ]),
  );
  if (!Object.keys(availableByCurrency).length) {
    availableByCurrency[details.defaultCurrency] = "0";
  }
  const currencies = Object.keys(availableByCurrency);

  return (
    <>
      <Link
        href="/admin/referrals"
        className="mb-5 inline-flex items-center gap-2 text-xs font-black text-black/55 hover:text-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to referral
        partners
      </Link>
      <AdminPageHeader
        eyebrow="Sub-admin referral profile"
        title={rollup.displayName}
        description="First-touch attribution, verified payment accounting, reversal history, payout allocation, and audited partner controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <ReferralPayoutDialog
              referralProfileId={rollup.id}
              availableByCurrency={availableByCurrency}
              returnTo={returnTo}
            />
            <ReferralAdjustmentDialog
              referralProfileId={rollup.id}
              currencies={currencies}
              returnTo={returnTo}
            />
          </div>
        }
      />
      <AdminNotice
        result={notice.admin_result}
        message={notice.admin_message}
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <ReferralLinkCard
            code={rollup.referralCode}
            url={details.referralUrl}
            enabled={
              rollup.referralEnabled &&
              rollup.referralOperational &&
              Boolean(referralConfig.attributionSecret)
            }
            attributionDays={referralConfig.attributionDays}
            commissionRateBasisPoints={rollup.commissionRateBasisPoints}
            variant="light"
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminMetricCard
              label="Referral clicks"
              value={rollup.totalClicks.toLocaleString()}
              detail={`${rollup.uniqueVisitors} unique`}
              icon={MousePointerClick}
            />
            <AdminMetricCard
              label="Registrations"
              value={rollup.referredRegistrations.toLocaleString()}
              icon={UserRoundPlus}
            />
            <AdminMetricCard
              label="Paying customers"
              value={rollup.payingCustomers.toLocaleString()}
              icon={UserCheck}
              tone="success"
            />
            <AdminMetricCard
              label="Successful payments"
              value={rollup.successfulTransactions.toLocaleString()}
              icon={ReceiptText}
            />
          </section>

          {financialEntries.map(([currency, summary]) => {
            const available = BigInt(summary.availableBalanceMinor);
            const owed = available > BigInt(0) ? available : BigInt(0);
            const recoverable = available < BigInt(0) ? -available : BigInt(0);
            return (
              <AdminPanel
                key={currency}
                title={`${currency} financial position`}
                description="Calculated from immutable ledger entries and paid payout allocations."
              >
                <div className="grid gap-px bg-black/8 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Referred revenue", summary.referredRevenueMinor],
                    ["Net profit", summary.referredProfitMinor],
                    ["Commission earned", summary.commissionEarnedMinor],
                    ["Pending", summary.pendingCommissionMinor],
                    ["Amount owed", owed.toString()],
                    ["Total paid", summary.totalPaidMinor],
                    ["Recoverable", recoverable.toString()],
                  ].map(([label, amount]) => (
                    <div key={label} className="bg-white p-5">
                      <p className="text-[11px] font-black text-black/42 uppercase">
                        {label}
                      </p>
                      <p className="mt-2 text-lg font-black">
                        {formatMinorCurrency(amount, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </AdminPanel>
            );
          })}

          <AdminPanel
            title="Commission ledger"
            description="Original earnings are preserved; refunds and chargebacks appear as linked negative entries."
          >
            {details.activity.length ? (
              <AdminTable>
                <AdminTableHead>
                  <AdminTh>Date</AdminTh>
                  <AdminTh>Customer</AdminTh>
                  <AdminTh>Reference</AdminTh>
                  <AdminTh>Product</AdminTh>
                  <AdminTh>Gross</AdminTh>
                  <AdminTh>Profit</AdminTh>
                  <AdminTh>Sub-admin</AdminTh>
                  <AdminTh>Entry</AdminTh>
                  <AdminTh>Status</AdminTh>
                </AdminTableHead>
                <tbody>
                  {details.activity.map((entry) => (
                    <tr key={entry.id}>
                      <AdminTd className="whitespace-nowrap">
                        {dateTime(entry.createdAt)}
                      </AdminTd>
                      <AdminTd className="min-w-48">
                        <p className="font-black">
                          {entry.customerDisplayName}
                        </p>
                        <p className="mt-1 text-xs text-black/42">
                          {entry.customerEmail}
                        </p>
                      </AdminTd>
                      <AdminTd className="font-mono text-xs">
                        {entry.paymentReference}
                      </AdminTd>
                      <AdminTd className="capitalize">
                        {entry.productCode || entry.sourcePaymentType}
                      </AdminTd>
                      <AdminTd>
                        {formatMinorCurrency(
                          entry.grossAmountMinor,
                          entry.currency,
                        )}
                      </AdminTd>
                      <AdminTd>
                        {formatMinorCurrency(
                          entry.netProfitMinor,
                          entry.currency,
                        )}
                      </AdminTd>
                      <AdminTd className="font-black">
                        {formatMinorCurrency(
                          entry.subAdminAmountMinor,
                          entry.currency,
                        )}
                      </AdminTd>
                      <AdminTd>
                        <ReferralStatusBadge status={entry.entryType} />
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusBadge status={entry.status} />
                      </AdminTd>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : (
              <AdminEmptyState
                icon={Activity}
                title="No commission entries"
                description="Only verified referred payments create earnings."
              />
            )}
          </AdminPanel>

          <div className="grid gap-4 lg:grid-cols-3">
            <AdminPanel title="Recent referral clicks">
              {details.clicks.length ? (
                <div className="divide-y divide-black/8">
                  {details.clicks.slice(0, 12).map((click) => (
                    <div key={String(click.id)} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {String(click.landing_page || "/")}
                          </p>
                          <p className="mt-1 text-xs text-black/42">
                            Code {String(click.referral_code_snapshot)}
                          </p>
                        </div>
                        <ReferralStatusBadge
                          status={String(click.event_type)}
                        />
                      </div>
                      <p className="mt-3 text-[11px] text-black/35">
                        {dateTime(String(click.created_at))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  icon={MousePointerClick}
                  title="No referral clicks"
                  description="Valid active-code visits will appear here."
                />
              )}
            </AdminPanel>

            <AdminPanel title="Referred registrations">
              {details.attributions.length ? (
                <div className="divide-y divide-black/8">
                  {details.attributions.map((attribution) => {
                    const profile = attribution.user as Record<
                      string,
                      unknown
                    > | null;
                    return (
                      <div key={String(attribution.id)} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {profile
                                ? String(profile.display_name)
                                : "Anonymous visitor"}
                            </p>
                            <p className="mt-1 truncate text-xs text-black/42">
                              {profile
                                ? String(profile.email)
                                : "Registration not completed"}
                            </p>
                          </div>
                          <AdminStatusBadge
                            status={profile ? "active" : "pending"}
                          />
                        </div>
                        <p className="mt-3 text-[11px] text-black/35">
                          Attributed{" "}
                          {dateTime(String(attribution.attributed_at))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <AdminEmptyState
                  icon={UserRoundPlus}
                  title="No attributions"
                  description="Valid first-touch attribution will appear here."
                />
              )}
            </AdminPanel>

            <AdminPanel title="Payout history">
              {details.payouts.length ? (
                <div className="divide-y divide-black/8">
                  {details.payouts.map((payout) => (
                    <div key={payout.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">
                            {formatMinorCurrency(
                              payout.amountMinor,
                              payout.currency,
                            )}
                          </p>
                          <p className="mt-1 text-xs text-black/42">
                            {payout.paymentMethod} · {payout.externalReference}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <AdminStatusBadge status={payout.status} />
                          {payout.status === "paid" ? (
                            <ReferralPayoutCancelAction
                              payoutId={payout.id}
                              returnTo={returnTo}
                            />
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-black/35">
                        {dateTime(payout.payoutDate)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  icon={Banknote}
                  title="No payouts"
                  description="Externally sent payments will be recorded here."
                />
              )}
            </AdminPanel>
          </div>

          <AdminPanel title="Referral audit activity">
            {details.audit.length ? (
              <ol className="divide-y divide-black/8">
                {details.audit.map((entry) => (
                  <li key={String(entry.id)} className="px-5 py-4">
                    <p className="text-sm font-black">
                      {String(entry.action).replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-black/48">
                      {String(entry.reason)}
                    </p>
                    <p className="mt-2 text-[11px] text-black/35">
                      {dateTime(String(entry.created_at))}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <AdminEmptyState
                title="No referral audit activity"
                description="Sensitive referral and payout actions will appear here."
              />
            )}
          </AdminPanel>
        </div>

        <aside className="space-y-4">
          <AdminPanel title="Partner profile">
            <dl className="grid gap-4 p-5 text-sm">
              <div>
                <dt className="text-xs text-black/42">Email</dt>
                <dd className="mt-1 font-black break-all">{rollup.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-black/42">Account status</dt>
                <dd className="mt-1">
                  <AdminStatusBadge
                    status={
                      rollup.referralOperational
                        ? "active"
                        : rollup.accountStatus
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-black/42">Referral link</dt>
                <dd className="mt-1">
                  <ReferralStatusBadge
                    status={
                      rollup.referralEnabled && rollup.referralOperational
                        ? "active"
                        : "disabled"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-black/42">Rate snapshot default</dt>
                <dd className="mt-1 font-black">
                  {(rollup.commissionRateBasisPoints / 100).toFixed(0)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-black/42">Created</dt>
                <dd className="mt-1 font-black">
                  {dateTime(rollup.createdAt)}
                </dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel
            title="Referral controls"
            description="Every change requires a reason and is audited."
          >
            <div className="flex flex-wrap gap-2 p-4">
              <ReferralProfileAction
                referralProfileId={rollup.id}
                operation={rollup.referralEnabled ? "disable" : "enable"}
                enabled={rollup.referralEnabled}
                returnTo={returnTo}
              />
              <ReferralProfileAction
                referralProfileId={rollup.id}
                operation="regenerate_code"
                enabled={rollup.referralEnabled}
                returnTo={returnTo}
              />
            </div>
          </AdminPanel>

          <AdminPanel
            title="Account access"
            description="Suspension immediately stops new qualifying referral activity."
          >
            <div className="flex flex-wrap gap-2 p-4">
              {rollup.accountStatus === "active" ? (
                <AdminActionDialog
                  kind="user_suspend"
                  targetId={rollup.userId}
                  label="Suspend sub-admin"
                  title="Suspend sub-admin account"
                  description="Referral eligibility stops immediately while financial history remains intact."
                  tone="danger"
                />
              ) : rollup.accountStatus === "suspended" ? (
                <AdminActionDialog
                  kind="user_reactivate"
                  targetId={rollup.userId}
                  label="Reactivate sub-admin"
                  title="Reactivate sub-admin account"
                  description="Restore account access after reviewing the suspension."
                  tone="success"
                />
              ) : null}
              <Link
                href={`/admin/users/${rollup.userId}`}
                className="inline-flex min-h-9 items-center rounded-full border border-black/12 px-3 text-xs font-black hover:bg-black/5"
              >
                Open user record
              </Link>
            </div>
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
