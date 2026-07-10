import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";

export const metadata: Metadata = {
  title: "Responsible Gaming",
  description: "18+ responsible-use guidance for Instant Seeker members.",
};

export default function ResponsibleGamingPage() {
  return (
    <LegalShell
      eyebrow="18+ responsible use"
      title="Keep betting recreational"
      intro="Instant Seeker supplies probability-based context. It cannot remove uncertainty, prevent losses, or make betting safe for everyone."
    >
      <h2>Before you begin</h2>
      <p>
        Only adults aged 18 or older may use Instant Seeker. Do not bet with
        money needed for housing, food, education, healthcare, debt payments, or
        family obligations.
      </p>
      <h2>Set firm limits</h2>
      <ul>
        <li>
          Choose a spending limit and time limit before viewing any analysis.
        </li>
        <li>
          Do not increase a stake because of a prior loss or a high confidence
          label.
        </li>
        <li>
          Treat every result as uncertain, including results that appear
          statistically favorable.
        </li>
        <li>
          Take regular breaks and keep betting separate from income plans.
        </li>
      </ul>
      <h2>Know the warning signs</h2>
      <p>
        Pause and seek help if betting is becoming secretive, causing conflict,
        affecting sleep or work, leading to borrowing, or creating pressure to
        recover losses. An analysis tool should never be used to justify
        chasing.
      </p>
      <h2>Get support</h2>
      <p>
        Use your betting platform’s deposit, time-out, and self-exclusion
        controls where available. Contact a licensed responsible-gambling
        support service in your country or a qualified healthcare professional.
        If you are in immediate danger or crisis, contact local emergency
        services.
      </p>
      <h2>What Instant Seeker does not do</h2>
      <p>
        Instant Seeker does not accept bets, store gambling balances, transfer
        betting funds, guarantee results, or obtain private information from
        betting platforms.
      </p>
    </LegalShell>
  );
}
