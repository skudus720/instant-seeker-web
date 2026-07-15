import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/account-recovery-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      mode="login"
      title="Choose a new password"
      description="Use at least eight characters with uppercase, lowercase, and a number."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
