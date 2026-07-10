import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Instant Seeker account. You must be at least 18.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Set up a private analysis workspace. You must be at least 18 and accept the service terms."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
