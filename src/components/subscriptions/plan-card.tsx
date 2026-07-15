import { Check, Crown, Sparkles } from "lucide-react";
import { PlanCheckoutButton } from "@/components/subscriptions/plan-checkout-button";
import type { PlanCode, SubscriptionPlan } from "@/lib/subscriptions/plans";
import { cn, formatCurrency } from "@/lib/utils";

export function PlanCard({
  plan,
  demoMode,
  activePlanCode,
  position,
}: {
  plan: SubscriptionPlan;
  demoMode: boolean;
  activePlanCode?: PlanCode;
  position: number;
}) {
  const active = activePlanCode === plan.code;
  return (
    <article
      className={cn(
        "relative flex min-h-[36rem] flex-col overflow-hidden rounded-lg border bg-[#121212] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:p-8",
        plan.popular
          ? "border-signal shadow-[0_24px_70px_rgba(255,202,39,0.08)]"
          : "border-white/12",
      )}
      aria-labelledby={`${plan.code}-plan-title`}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          plan.popular ? "bg-signal" : "bg-white/12",
        )}
        aria-hidden="true"
      />
      <div className="flex min-h-9 items-start justify-between gap-3">
        <span className="text-[11px] font-black text-white/30 uppercase">
          0{position} / access pass
        </span>
        {plan.popular ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-3 py-1.5 text-[10px] font-black text-ink uppercase">
            <Crown className="size-3" aria-hidden="true" />
            Popular
          </span>
        ) : active ? (
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black text-emerald-200 uppercase">
            Active
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full border border-signal/25 bg-signal/[0.07] text-signal">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <h2 id={`${plan.code}-plan-title`} className="text-2xl font-black">
          {plan.name}
        </h2>
      </div>
      {active && plan.popular ? (
        <span className="mt-4 w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black text-emerald-200 uppercase">
          Active now
        </span>
      ) : null}
      <p className="mt-7 text-4xl font-black">
        {formatCurrency(plan.amount, plan.currency)}
      </p>
      <p className="mt-3 w-fit rounded-full border border-signal/25 bg-signal/[0.07] px-3 py-1.5 text-xs font-black text-signal">
        {plan.durationHours}-hour access window
      </p>
      <p className="mt-6 min-h-12 text-sm leading-6 text-white/48">
        {plan.description}
      </p>
      <ul className="mt-7 grid gap-4 border-t border-white/10 pt-7 text-sm text-white/72">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check
              className="mt-0.5 size-4 shrink-0 text-signal"
              strokeWidth={3}
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <PlanCheckoutButton
        planCode={plan.code}
        planName={plan.name}
        demoMode={demoMode}
        extending={active}
      />
    </article>
  );
}
