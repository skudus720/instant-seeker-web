"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  forgotPasswordAction,
  resetPasswordAction,
  type AuthActionResult,
} from "@/actions/auth";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";

const inputClass =
  "mt-2 min-h-12 w-full rounded-md border border-black/18 bg-white px-4 text-ink outline-none focus:border-black focus:ring-2 focus:ring-signal/55";

function Result({ value }: { value: AuthActionResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (value && !value.ok) ref.current?.focus();
  }, [value]);
  if (!value) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={value.ok ? "status" : "alert"}
      className={
        value.ok
          ? "rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          : "rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
      }
    >
      {value.message}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={handleSubmit(async (values) =>
        setResult(await forgotPasswordAction(values)),
      )}
    >
      <Result value={result} />
      <div>
        <label
          htmlFor="recovery-email"
          className="text-sm font-bold text-graphite"
        >
          Email address
        </label>
        <input
          id="recovery-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "recovery-email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="recovery-email-error"
            className="mt-2 text-xs font-semibold text-rose-700"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white disabled:opacity-60"
      >
        {isSubmitting ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {isSubmitting ? "Requesting…" : "Send reset email"}
      </button>
      <Link
        href="/login"
        className="text-center text-sm font-black text-black underline underline-offset-4"
      >
        Return to login
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });
  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const response = await resetPasswordAction(values);
        setResult(response);
        if (response.redirectTo) {
          router.push(response.redirectTo);
          router.refresh();
        }
      })}
    >
      <Result value={result} />
      <div>
        <label
          htmlFor="new-password"
          className="text-sm font-bold text-graphite"
        >
          New password
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            className={`${inputClass} pr-12`}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "new-password-error" : undefined
            }
            {...register("password")}
          />
          <button
            type="button"
            className="absolute top-2 right-1 grid size-10 place-items-center rounded-md text-black/50"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            title={visible ? "Hide password" : "Show password"}
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p
            id="new-password-error"
            className="mt-2 text-xs font-semibold text-rose-700"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="new-password-confirm"
          className="text-sm font-bold text-graphite"
        >
          Confirm new password
        </label>
        <input
          id="new-password-confirm"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          className={inputClass}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "new-password-confirm-error" : undefined
          }
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p
            id="new-password-confirm-error"
            className="mt-2 text-xs font-semibold text-rose-700"
          >
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white disabled:opacity-60"
      >
        {isSubmitting ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {isSubmitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
