import type { Metadata } from "next";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";
import { requirePaidUser } from "@/lib/auth";
import { getSubscriptionPlan } from "@/lib/subscriptions/plans";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "IS"
  );
}

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ProfilePage() {
  const user = await requirePaidUser("/profile");
  const plan = user.subscription
    ? getSubscriptionPlan(user.subscription.planCode)
    : null;

  return (
    <AppShell user={user} current="profile" theme="dark">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-9 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <span
              className="grid size-18 shrink-0 place-items-center rounded-full border border-signal/60 bg-signal text-xl font-black text-ink shadow-[0_0_38px_rgba(255,202,39,0.18)]"
              aria-hidden="true"
            >
              {initials(user.displayName)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black text-signal uppercase">
                Private member profile
              </p>
              <h1 className="mt-2 text-3xl font-black break-words sm:text-5xl">
                {user.displayName}
              </h1>
              <p className="mt-2 truncate text-sm text-white/42">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Account active
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/62">
              <LockKeyhole
                className="size-3.5 text-signal"
                aria-hidden="true"
              />
              Private details
            </span>
          </div>
        </header>

        {user.demo ? (
          <div className="mt-7 rounded-lg border border-signal/25 bg-signal/[0.07] px-4 py-3 text-sm leading-6 text-white/68">
            <strong className="text-signal">Demo preview:</strong> profile
            changes are validated but are not stored.
          </div>
        ) : null}

        <div className="mt-9 grid items-start gap-7 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-lg border border-white/12 bg-[#121212] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black text-signal uppercase">
                  Personal details
                </p>
                <h2 className="mt-2 text-2xl font-black">Edit your profile</h2>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-signal">
                <KeyRound className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/42">
              Keep your display and payment-matching details current.
            </p>
            <ProfileDetailsForm
              displayName={user.displayName}
              email={user.email}
              momoNumber={user.momoNumber}
              demoMode={user.demo}
            />
          </section>

          <div className="grid gap-7">
            <section className="rounded-lg border border-white/12 bg-[#121212] p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-signal uppercase">
                    Membership
                  </p>
                  <h2 className="mt-2 text-xl font-black">Account access</h2>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-signal text-ink">
                  <CreditCard className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/42">Status</span>
                  <span className="font-black text-emerald-200">
                    {user.demo ? "Demo preview" : "Verified"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/42">Account fee</span>
                  <span className="font-black">
                    {user.demo ? "Not collected" : "GHS 50.00 paid"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/42">Role</span>
                  <span className="font-black capitalize">{user.role}</span>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-signal/30 bg-[#121212] p-6 shadow-[0_20px_50px_rgba(255,202,39,0.06)] sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black text-signal uppercase">
                    AI plan
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {plan ? plan.name : "No active plan"}
                  </h2>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-signal/30 bg-signal/[0.08] text-signal">
                  {plan ? (
                    <Sparkles className="size-4" aria-hidden="true" />
                  ) : (
                    <LockKeyhole className="size-4" aria-hidden="true" />
                  )}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/45">
                {plan && user.subscription
                  ? `Your current access remains available until ${formatExpiry(user.subscription.expiresAt)}.`
                  : "Choose a time-limited plan to unlock new screenshot analyses. Your saved history remains private."}
              </p>
              {plan && user.subscription ? (
                <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-5 text-xs font-bold text-white/48">
                  <Clock3 className="size-4 text-signal" aria-hidden="true" />
                  <time dateTime={user.subscription.expiresAt}>
                    Ends {formatExpiry(user.subscription.expiresAt)}
                  </time>
                </div>
              ) : null}
              <Link
                href="/plans"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-signal px-5 py-3 text-sm font-black text-ink shadow-[0_12px_30px_rgba(255,202,39,0.13)] transition-transform hover:-translate-y-0.5 hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-0"
              >
                {plan ? "Extend AI access" : "View AI plans"}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </section>

            <Link
              href="/forgot-password"
              className="flex min-h-16 items-center justify-between gap-4 rounded-full border border-white/12 bg-white/[0.035] px-6 text-sm font-black text-white/70 hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal"
            >
              <span className="inline-flex items-center gap-3">
                <KeyRound className="size-4 text-signal" aria-hidden="true" />
                Reset password
              </span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs leading-6 text-white/34">
          Instant Seeker never stores Mobile Money PINs or approval codes. Email
          and password changes use separate verified authentication flows.
        </p>
      </div>
    </AppShell>
  );
}
