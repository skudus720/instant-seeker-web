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
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      description="Log in to upload a new screenshot or review your private analysis history."
    >
      <AuthForm mode="login" redirectTo={sanitizeRedirect(params.next)} />
    </AuthShell>
  );
}
