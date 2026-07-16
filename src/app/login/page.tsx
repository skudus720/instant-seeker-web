import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { sanitizeRedirect } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your private Instant Seeker dashboard.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; payment?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      mode="login"
      title="Welcome back"
      description="Log in to access private reports and continue AI-assisted screenshot analysis."
      notice={
        params.payment === "success"
          ? "Payment confirmed. Confirm your email if requested, then log in to continue."
          : params.payment === "failed"
            ? "We could not verify that payment. No access change was made; log in to retry securely."
            : undefined
      }
    >
      <AuthForm mode="login" redirectTo={sanitizeRedirect(params.next)} />
    </AuthShell>
  );
}
