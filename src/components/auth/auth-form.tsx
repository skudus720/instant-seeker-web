"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
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
  "min-h-14 w-full rounded-2xl border border-white/12 bg-white/[0.045] px-11 text-white outline-none transition-colors placeholder:text-white/25 hover:border-white/22 focus:border-signal focus:ring-2 focus:ring-signal/20";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-xs font-semibold text-rose-300">
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
          ? "rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
          : "rounded-md border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
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
  icon: Icon,
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
  icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-white/82">
        {label}
      </label>
      <div className="relative mt-2">
        <Icon
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-signal"
          aria-hidden="true"
        />
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
          className={inputClass}
          {...registration}
        />
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-5 text-white/36">
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
    <div>
      <label htmlFor={id} className="text-sm font-bold text-white/82">
        {label}
      </label>
      <div className="relative mt-2">
        <LockKeyhole
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-signal"
          aria-hidden="true"
        />
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} pr-12`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-md text-white/45 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-signal"
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

function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-signal px-5 py-3 font-black text-ink shadow-[0_16px_34px_rgba(255,202,39,0.18)] transition-transform hover:-translate-y-0.5 hover:bg-[#ffd64f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-0 disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? (
        <LoaderCircle
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}
      {pending ? pendingLabel : label}
      {!pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
    </button>
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
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-white/58">
        <span className="relative mt-0.5 grid size-4 shrink-0 place-items-center">
          <input
            type="checkbox"
            className="peer size-4 appearance-none rounded-[3px] border border-white/28 bg-white/5 checked:border-signal checked:bg-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            {...registration}
          />
          <Check
            className="pointer-events-none absolute size-3 text-ink opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        </span>
        <span>{children}</span>
      </label>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-rose-300">{error}</p>
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
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormStatus result={result} />

      <div className="rounded-2xl border border-signal/30 bg-signal/10 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-signal text-ink">
              <ReceiptText className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-white">
                One-time Mobile Money access
              </span>
              <span className="block text-xs text-white/45">
                No subscription · No betting deposit · Paystack secure checkout
              </span>
            </span>
          </span>
          <strong className="shrink-0 text-xl font-black text-signal">
            {signupFeeLabel}
          </strong>
        </div>
      </div>

      <TextField
        id="displayName"
        label="Full or display name"
        autoComplete="name"
        placeholder="Your name"
        error={errors.displayName?.message}
        registration={register("displayName")}
        icon={UserRound}
      />
      <TextField
        id="signup-email"
        label="Email address"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        registration={register("email")}
        icon={Mail}
      />
      <TextField
        id="momo-number"
        label="Mobile Money number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="024 123 4567"
        hint="Use the Ghana number you intend to pay with. Paystack may ask you to confirm it during checkout."
        error={errors.momoNumber?.message}
        registration={register("momoNumber")}
        icon={Phone}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          placeholder="8+ characters"
          error={errors.password?.message}
          registration={register("password")}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat password"
          error={errors.confirmPassword?.message}
          registration={register("confirmPassword")}
        />
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-5">
        <CheckboxField
          error={errors.ageConfirmed?.message}
          registration={register("ageConfirmed")}
        >
          I confirm that I am at least 18 years old.
        </CheckboxField>
        <CheckboxField
          error={errors.termsAccepted?.message}
          registration={register("termsAccepted")}
        >
          I accept the{" "}
          <Link
            className="font-bold text-white underline underline-offset-4"
            href="/terms"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            className="font-bold text-white underline underline-offset-4"
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
          I understand the {signupFeeLabel} fee is for platform access only.
        </CheckboxField>
      </div>

      <SubmitButton
        pending={isSubmitting}
        pendingLabel={demoMode ? "Validating…" : "Opening checkout…"}
        label={
          demoMode
            ? "Preview signup · no charge"
            : `Pay with Mobile Money · ${signupFeeLabel}`
        }
      />

      <p className="flex items-start gap-2 text-xs leading-5 text-white/38">
        <ShieldCheck
          className="mt-0.5 size-3.5 shrink-0 text-success"
          aria-hidden="true"
        />
        Your MoMo number is stored privately for account and payment matching.
        PINs and payment approvals are handled only by Paystack.
      </p>

      <p className="text-center text-sm text-white/48">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-black text-signal underline underline-offset-4"
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
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormStatus result={result} />
      <input type="hidden" {...register("redirectTo")} />
      <TextField
        id="login-identifier"
        label="Email address or username"
        inputMode="text"
        autoComplete="username"
        placeholder="you@example.com or username"
        error={errors.identifier?.message}
        registration={register("identifier")}
        icon={UserRound}
      />
      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        error={errors.password?.message}
        registration={register("password")}
      />
      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-white/52">
          <input
            type="checkbox"
            className="size-4 accent-signal"
            {...register("remember")}
          />
          Remember me
        </label>
        <Link
          href="/forgot-password"
          className="font-bold text-white/70 underline underline-offset-4 hover:text-white"
        >
          Forgot password?
        </Link>
      </div>
      <SubmitButton
        pending={isSubmitting}
        pendingLabel="Signing in…"
        label="Log in securely"
      />
      <p className="text-center text-sm text-white/48">
        New to Instant Seeker?{" "}
        <Link
          href="/signup"
          className="font-black text-signal underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
