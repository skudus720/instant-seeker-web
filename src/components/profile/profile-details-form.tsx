"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  updateProfileAction,
  type ProfileActionResult,
} from "@/actions/profile";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";

const inputClass =
  "min-h-14 w-full rounded-full border border-white/12 bg-white/[0.045] px-12 text-sm font-semibold text-white outline-none transition-colors placeholder:text-white/25 hover:border-white/22 focus:border-signal focus:ring-2 focus:ring-signal/20";

export function ProfileDetailsForm({
  displayName,
  email,
  momoNumber,
  demoMode,
}: {
  displayName: string;
  email: string;
  momoNumber: string | null;
  demoMode: boolean;
}) {
  const router = useRouter();
  const statusRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName,
      momoNumber: momoNumber || "",
    },
  });

  useEffect(() => {
    if (result) statusRef.current?.focus();
  }, [result]);

  const submit = handleSubmit(async (values) => {
    const response = await updateProfileAction(values);
    setResult(response);
    if (response.ok && !demoMode) router.refresh();
  });

  return (
    <form onSubmit={submit} noValidate className="mt-7 grid gap-6">
      {result ? (
        <div
          ref={statusRef}
          tabIndex={-1}
          role={result.ok ? "status" : "alert"}
          className={
            result.ok
              ? "flex items-start gap-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
              : "rounded-lg border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100"
          }
        >
          {result.ok ? (
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
          {result.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="profile-name"
          className="text-sm font-bold text-white/76"
        >
          Display name
        </label>
        <div className="relative mt-2">
          <UserRound
            className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-signal"
            aria-hidden="true"
          />
          <input
            id="profile-name"
            autoComplete="name"
            className={inputClass}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={
              errors.displayName ? "profile-name-error" : undefined
            }
            {...register("displayName")}
          />
        </div>
        {errors.displayName ? (
          <p
            id="profile-name-error"
            className="mt-2 text-xs font-semibold text-rose-300"
          >
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="profile-email"
          className="text-sm font-bold text-white/76"
        >
          Email address
        </label>
        <div className="relative mt-2">
          <Mail
            className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-white/35"
            aria-hidden="true"
          />
          <input
            id="profile-email"
            type="email"
            autoComplete="email"
            value={email}
            readOnly
            className={`${inputClass} cursor-not-allowed pr-12 text-white/48`}
            aria-describedby="profile-email-hint"
          />
          <LockKeyhole
            className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-white/28"
            aria-hidden="true"
          />
        </div>
        <p
          id="profile-email-hint"
          className="mt-2 text-xs leading-5 text-white/36"
        >
          Email changes require a verified authentication flow and are not
          edited here.
        </p>
      </div>

      <div>
        <label
          htmlFor="profile-momo"
          className="text-sm font-bold text-white/76"
        >
          Mobile Money number
        </label>
        <div className="relative mt-2">
          <Phone
            className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-signal"
            aria-hidden="true"
          />
          <input
            id="profile-momo"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="024 123 4567"
            className={inputClass}
            aria-invalid={Boolean(errors.momoNumber)}
            aria-describedby={
              errors.momoNumber ? "profile-momo-error" : "profile-momo-hint"
            }
            {...register("momoNumber")}
          />
        </div>
        {errors.momoNumber ? (
          <p
            id="profile-momo-error"
            className="mt-2 text-xs font-semibold text-rose-300"
          >
            {errors.momoNumber.message}
          </p>
        ) : (
          <p
            id="profile-momo-hint"
            className="mt-2 text-xs leading-5 text-white/36"
          >
            Used privately for account and payment matching. We never request
            your PIN.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || (!isDirty && !demoMode)}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-signal px-6 py-3 font-black text-ink shadow-[0_12px_32px_rgba(255,202,39,0.16)] transition-transform hover:-translate-y-0.5 hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isSubmitting ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Save className="size-4" aria-hidden="true" />
        )}
        {isSubmitting
          ? "Saving changes…"
          : demoMode
            ? "Preview profile update"
            : "Save profile changes"}
      </button>
    </form>
  );
}
