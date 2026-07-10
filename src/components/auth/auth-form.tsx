"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  loginAction,
  signupAction,
  type AuthActionResult,
} from "@/actions/auth";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/lib/validation/auth";

const inputClass =
  "mt-2 min-h-12 w-full rounded-md border border-black/18 bg-white px-4 text-[#090909] outline-none transition-colors placeholder:text-black/32 focus:border-black focus:ring-2 focus:ring-[#ffd400]/55";

function FormStatus({ result }: { result: AuthActionResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result && !result.ok) ref.current?.focus();
  }, [result]);
  if (!result) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={result.ok ? "status" : "alert"}
      className={
        result.ok
          ? "mb-5 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          : "mb-5 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
      }
    >
      {result.message}
    </div>
  );
}

function PasswordField({
  id,
  label,
  error,
  registration,
  autoComplete,
}: {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-[#242624]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} pr-12`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute top-2 right-1 grid size-10 place-items-center rounded-md text-black/48 hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-[#090909]"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs font-semibold text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#090909] px-5 py-3 font-black text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#090909] active:translate-y-0 disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? (
        <LoaderCircle
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}
      {pending ? "Working…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: "signup" | "login";
  redirectTo?: string;
}) {
  return mode === "signup" ? (
    <SignupForm />
  ) : (
    <LoginForm redirectTo={redirectTo} />
  );
}

function SignupForm() {
  const router = useRouter();
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      ageConfirmed: undefined,
      termsAccepted: undefined,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const response = await signupAction(values);
    setResult(response);
    Object.entries(response.fieldErrors || {}).forEach(([field, messages]) => {
      setError(field as keyof SignupInput, { message: messages[0] });
    });
    if (response.redirectTo) {
      router.push(response.redirectTo);
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormStatus result={result} />
      <div>
        <label
          htmlFor="displayName"
          className="text-sm font-bold text-[#242624]"
        >
          Full or display name
        </label>
        <input
          id="displayName"
          autoComplete="name"
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={
            errors.displayName ? "displayName-error" : undefined
          }
          className={inputClass}
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p
            id="displayName-error"
            className="mt-2 text-xs font-semibold text-rose-700"
          >
            {errors.displayName.message}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="signup-email"
          className="text-sm font-bold text-[#242624]"
        >
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
          className={inputClass}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="signup-email-error"
            className="mt-2 text-xs font-semibold text-rose-700"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <PasswordField
        id="signup-password"
        label="Password"
        autoComplete="new-password"
        error={errors.password?.message}
        registration={register("password")}
      />
      <PasswordField
        id="confirm-password"
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registration={register("confirmPassword")}
      />
      <div className="grid gap-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-black/68">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[#090909]"
            {...register("ageConfirmed")}
          />
          <span>I confirm that I am at least 18 years old.</span>
        </label>
        {errors.ageConfirmed ? (
          <p className="text-xs font-semibold text-rose-700">
            {errors.ageConfirmed.message}
          </p>
        ) : null}
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-black/68">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[#090909]"
            {...register("termsAccepted")}
          />
          <span>
            I accept the{" "}
            <Link className="font-bold underline" href="/terms">
              Terms
            </Link>{" "}
            and{" "}
            <Link className="font-bold underline" href="/privacy">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.termsAccepted ? (
          <p className="text-xs font-semibold text-rose-700">
            {errors.termsAccepted.message}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={isSubmitting} label="Create account" />
      <p className="text-center text-sm text-black/55">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-black text-black underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true, redirectTo },
  });
  const onSubmit = handleSubmit(async (values) => {
    const response = await loginAction(values);
    setResult(response);
    Object.entries(response.fieldErrors || {}).forEach(([field, messages]) =>
      setError(field as keyof LoginInput, { message: messages[0] }),
    );
    if (response.redirectTo) {
      router.push(response.redirectTo);
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormStatus result={result} />
      <input type="hidden" {...register("redirectTo")} />
      <div>
        <label
          htmlFor="login-email"
          className="text-sm font-bold text-[#242624]"
        >
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={inputClass}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="login-email-error"
            className="mt-2 text-xs font-semibold text-rose-700"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        registration={register("password")}
      />
      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-black/62">
          <input
            type="checkbox"
            className="size-4 accent-[#090909]"
            {...register("remember")}
          />
          Remember me
        </label>
        <Link
          href="/forgot-password"
          className="font-bold text-black underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={isSubmitting} label="Log in" />
      <p className="text-center text-sm text-black/55">
        New to Instant Seeker?{" "}
        <Link
          href="/signup"
          className="font-black text-black underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
