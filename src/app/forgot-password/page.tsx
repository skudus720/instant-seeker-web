import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/account-recovery-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email. For privacy, the response is the same whether or not an account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
