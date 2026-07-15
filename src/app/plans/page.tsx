import type { Metadata } from "next";
import { Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { requirePaidUser } from "@/lib/auth";
import {
  getSubscriptionPlan,
  subscriptionPlans,
} from "@/lib/subscriptions/plans";

export const metadata: Metadata = {
  title: "AI access plans",
  description: "Choose a time-limited Instant Seeker AI analysis access plan.",
};
export const dynamic = "force-dynamic";

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requirePaidUser("/plans");
  const params = await searchParams;
  const activePlan = user.subscription
    ? getSubscriptionPlan(user.subscription.planCode)
    : null;

  return (
    <AppShell user={user} current="plans" theme="dark">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-signal/25 bg-signal/[0.07] px-4 py-2 text-xs font-black text-signal uppercase">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            AI access plans
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-6xl">
            Choose your analysis window
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">
            Select a one-time access pass after activating your account. Pay
            securely with Mobile Money or card; plans do not renew
            automatically.
          </p>
        </div>

        {params.payment === "success" ? (
          <div
            role="status"
            className="mt-8 flex items-start gap-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-5 py-4 text-sm text-emerald-100"
          >
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            Payment verified. Your AI access window is active.
          </div>
        ) : params.payment === "failed" ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-rose-300/25 bg-rose-300/10 px-5 py-4 text-sm text-rose-100"
          >
            We could not verify that plan payment. No access time was added and
            no plan change was made.
          </div>
        ) : null}

        {user.demo ? (
          <div className="mt-8 rounded-lg border border-signal/25 bg-signal/[0.07] px-5 py-4 text-sm leading-6 text-white/72">
            <strong className="text-signal">Demo preview:</strong> plan checkout
            is disabled, no payment is collected, and no subscription is
            created.
          </div>
        ) : activePlan && user.subscription ? (
          <section
            className="mt-8 flex flex-col gap-4 rounded-lg border border-signal/25 bg-signal/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Current AI plan"
          >
            <div>
              <p className="text-xs font-black text-signal uppercase">
                Active plan
              </p>
              <p className="mt-1 text-xl font-black">{activePlan.name}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/58">
              <Clock3 className="size-4 text-signal" aria-hidden="true" />
              <span>
                Available until{" "}
                <time dateTime={user.subscription.expiresAt}>
                  {formatExpiry(user.subscription.expiresAt)}
                </time>
              </span>
            </div>
          </section>
        ) : (
          <section
            className="mt-8 flex items-center gap-3 rounded-lg border border-white/10 bg-[#101010] p-5 text-sm text-white/58"
            aria-label="AI plan status"
          >
            <LockKeyhole className="size-4 text-signal" aria-hidden="true" />
            No active AI plan. Your account and saved history remain available.
          </section>
        )}

        <section
          className="mt-12 grid gap-7 lg:grid-cols-3"
          aria-label="Available AI access plans"
        >
          {subscriptionPlans.map((plan, index) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              demoMode={user.demo}
              activePlanCode={user.subscription?.planCode}
              position={index + 1}
            />
          ))}
        </section>

        <div className="mt-10 grid gap-4 border-t border-white/10 pt-7 text-xs leading-6 text-white/42 sm:grid-cols-3">
          <p>Access begins only after server-side payment verification.</p>
          <p>Buying early adds the new duration after remaining active time.</p>
          <p>Analysis guarantees outcomes. 18+.</p>
        </div>
      </div>
    </AppShell>
  );
}
