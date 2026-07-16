"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-semibold text-rose-400">
      {message}
    </p>
  );
}

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
          ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300"
          : "rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300"
      }
    >
      {result.message}
    </div>
  );
}

function TextField({
  id,
  label,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  hint,
  error,
  registration,
}: {
  id: string;
  label: string;
  type?: string;
  inputMode?: "email" | "tel" | "text";
  autoComplete: string;
  placeholder: string;
  hint?: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[#94A3B8]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className="w-full rounded-lg border border-white/10 bg-[#07080A] px-4 py-3 text-sm text-white placeholder-white/20 transition-all focus:border-[#FFCA27] focus:ring-1 focus:ring-[#FFCA27]/50 focus:outline-none"
        {...registration}
      />
      {hint ? (
        <p
          id={`${id}-hint`}
          className="text-[11px] leading-relaxed text-[#64748B]"
        >
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function PasswordField({
  id,
  label,
  error,
  registration,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
  autoComplete: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[#94A3B8]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full rounded-lg border border-white/10 bg-[#07080A] py-3 pr-11 pl-4 text-sm text-white placeholder-white/20 transition-all focus:border-[#FFCA27] focus:ring-1 focus:ring-[#FFCA27]/50 focus:outline-none"
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#94A3B8] transition-colors hover:text-white"
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
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function CheckboxField({
  error,
  registration,
  children,
}: {
  error?: string;
  registration: UseFormRegisterReturn;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="group flex cursor-pointer items-start gap-3 text-sm leading-snug text-[#94A3B8] transition-colors hover:text-white">
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            type="checkbox"
            className="peer size-5 cursor-pointer appearance-none rounded-md border border-white/10 bg-transparent transition-all duration-200 checked:border-[#FFCA27] checked:bg-[#FFCA27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFCA27]/50"
            {...registration}
          />
          <Check
            className="pointer-events-none absolute size-3.5 scale-75 text-black opacity-0 transition-transform peer-checked:scale-100 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        </span>
        <span className="pt-0.5">{children}</span>
      </label>
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}

export function AuthForm({
  mode,
  redirectTo,
  demoMode = false,
  signupFeeLabel = "GHS 50.00",
}: {
  mode: "signup" | "login";
  redirectTo?: string;
  demoMode?: boolean;
  signupFeeLabel?: string;
}) {
  return mode === "signup" ? (
    <SignupForm demoMode={demoMode} signupFeeLabel={signupFeeLabel} />
  ) : (
    <LoginForm redirectTo={redirectTo} />
  );
}

function SignupForm({
  demoMode,
  signupFeeLabel,
}: {
  demoMode: boolean;
  signupFeeLabel: string;
}) {
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
      momoNumber: "",
      password: "",
      confirmPassword: "",
      ageConfirmed: undefined,
      termsAccepted: undefined,
      feeAccepted: undefined,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const response = await signupAction(values);
    setResult(response);
    Object.entries(response.fieldErrors || {}).forEach(([field, messages]) => {
      setError(field as keyof SignupInput, { message: messages[0] });
    });
    if (response.checkoutUrl) {
      window.location.assign(response.checkoutUrl);
      return;
    }
    if (response.redirectTo) {
      router.push(response.redirectTo);
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormStatus result={result} />

      {/* Display Name & Email */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          id="displayName"
          label="Display Name"
          autoComplete="name"
          placeholder="Seeker01"
          error={errors.displayName?.message}
          registration={register("displayName")}
        />
        <TextField
          id="signup-email"
          label="Email Address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          registration={register("email")}
        />
      </div>

      {/* MoMo Number */}
      <div className="space-y-1.5">
        <label
          htmlFor="momo-number"
          className="text-xs font-medium text-[#94A3B8]"
        >
          MoMo Number (Ghana)
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <span className="text-sm text-[#94A3B8]">+233</span>
          </div>
          <input
            id="momo-number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="54 XXX XXXX"
            aria-invalid={Boolean(errors.momoNumber)}
            aria-describedby={
              [
                errors.momoNumber ? "momo-number-error" : null,
                "momo-number-hint",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="w-full rounded-lg border border-white/10 bg-[#07080A] py-3 pr-4 pl-14 font-mono text-sm tracking-wide text-white placeholder-white/20 transition-all focus:border-[#FFCA27] focus:ring-1 focus:ring-[#FFCA27]/50 focus:outline-none"
            {...register("momoNumber")}
          />
        </div>
        <p
          id="momo-number-hint"
          className="text-[11px] leading-relaxed text-[#64748B]"
        >
          Use the Ghana number you intend to pay with. Paystack may ask you to
          confirm it during checkout.
        </p>
        <FieldError
          id="momo-number-error"
          message={errors.momoNumber?.message}
        />
      </div>

      {/* Passwords */}
      <div className="space-y-5">
        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          registration={register("password")}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          registration={register("confirmPassword")}
        />
      </div>

      {/* Consents */}
      <div className="space-y-4 pt-2">
        <CheckboxField
          error={errors.ageConfirmed?.message}
          registration={register("ageConfirmed")}
        >
          I confirm that I am 18 years of age or older.
        </CheckboxField>

        <CheckboxField
          error={errors.termsAccepted?.message}
          registration={register("termsAccepted")}
        >
          I accept the{" "}
          <Link
            className="font-medium text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-[#FFCA27]"
            href="/terms"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            className="font-medium text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-[#FFCA27]"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          .
        </CheckboxField>

        <CheckboxField
          error={errors.feeAccepted?.message}
          registration={register("feeAccepted")}
        >
          I understand there is a one-time platform access fee via Mobile Money.
        </CheckboxField>
      </div>

      {/* CTA */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-[#FFCA27] py-3.5 font-semibold text-black transition-all duration-200 hover:bg-[#E5B41E] disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2 py-1">
              <LoaderCircle className="size-4 animate-spin text-black" />
              <span className="text-[15px] font-semibold">
                {demoMode ? "Validating…" : "Opening checkout…"}
              </span>
            </div>
          ) : (
            <>
              <span className="block text-[15px]">
                {demoMode
                  ? "Preview signup · no charge"
                  : `Pay with Mobile Money · ${signupFeeLabel}`}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium opacity-75">
                Access fee only — not a betting stake
              </span>
            </>
          )}
        </button>
      </div>

      {/* Login Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-[#94A3B8]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-[#FFCA27]"
          >
            Log in
          </Link>
        </p>
      </div>
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
    defaultValues: {
      identifier: "",
      password: "",
      remember: true,
      redirectTo,
    },
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
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormStatus result={result} />
      <input type="hidden" {...register("redirectTo")} />

      <TextField
        id="login-identifier"
        label="Email Address or Username"
        inputMode="text"
        autoComplete="username"
        placeholder="name@example.com or username"
        error={errors.identifier?.message}
        registration={register("identifier")}
      />

      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        registration={register("password")}
      />

      <div className="flex items-center justify-between gap-4 pt-1 text-sm">
        <label className="group flex cursor-pointer items-center gap-2.5 text-[#94A3B8] transition-colors hover:text-white">
          <span className="relative grid size-4 shrink-0 place-items-center">
            <input
              type="checkbox"
              className="peer size-4 cursor-pointer appearance-none rounded border border-white/10 bg-transparent transition-all duration-200 checked:border-[#FFCA27] checked:bg-[#FFCA27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFCA27]/50"
              {...register("remember")}
            />
            <Check
              className="pointer-events-none absolute size-2.5 scale-75 text-black opacity-0 transition-transform peer-checked:scale-100 peer-checked:opacity-100"
              strokeWidth={3}
              aria-hidden="true"
            />
          </span>
          <span className="text-sm">Remember me</span>
        </label>
        <Link
          href="/forgot-password"
          className="text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-[#FFCA27]"
        >
          Forgot password?
        </Link>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-[#FFCA27] py-3.5 font-semibold text-black transition-all duration-200 hover:bg-[#E5B41E] disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2 py-0.5">
              <LoaderCircle className="size-4 animate-spin text-black" />
              <span className="text-sm font-semibold">Signing in…</span>
            </div>
          ) : (
            <span className="text-sm font-semibold">Log in securely</span>
          )}
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-[#94A3B8]">
          New to Instant Seeker?{" "}
          <Link
            href="/signup"
            className="font-medium text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-[#FFCA27]"
          >
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}
