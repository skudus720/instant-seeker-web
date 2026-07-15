import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { appConfig, isDemoMode } from "@/lib/config";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Instant Seeker account. You must be at least 18.",
};

export default function SignupPage() {
  return (
    <AuthShell
      mode="signup"
      title="Create your account"
      description={`Set up your private workspace, then complete the one-time ${formatCurrency(appConfig.signupFeeAmount, appConfig.signupFeeCurrency)} access payment.`}
    >
      <AuthForm
        mode="signup"
        demoMode={isDemoMode}
        signupFeeLabel={formatCurrency(
          appConfig.signupFeeAmount,
          appConfig.signupFeeCurrency,
        )}
      />
    </AuthShell>
  );
}
