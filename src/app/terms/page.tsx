import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms"
      title="Use Instant Seeker responsibly"
      intro="These terms are a practical product draft and require legal review before a commercial launch."
    >
      <h2>Eligibility</h2>
      <p>
        You must be at least 18 years old and legally permitted to view
        betting-related analysis in your jurisdiction. You are responsible for
        following local law and platform rules.
      </p>
      <h2>Analysis, not certainty</h2>
      <p>
        Instant Seeker analyzes visible information in screenshots and returns
        probability-based estimates, confidence indicators, risk notes, and
        explanations. Results may be incomplete or wrong and never guarantee an
        outcome or financial return.
      </p>
      <h2>Independent service</h2>
      <p>
        Instant Seeker is independent and is not affiliated with or endorsed by
        SportyBet or any other betting platform unless the owner later obtains
        written authorization. It does not access private sportsbook systems,
        manipulate outcomes, accept bets, or handle gambling funds.
      </p>
      <h2>Permitted use</h2>
      <p>
        You may upload screenshots that you are permitted to use. Do not upload
        another person’s private details, unlawful material, malware, or
        misleading evidence. Do not attempt to bypass access controls or use the
        service to deceive others.
      </p>
      <h2>Reviews and win records</h2>
      <p>
        User-submitted reviews and win records may be moderated. Approval never
        changes the original rating, text, amount, or author attribution. The
        service may reject or remove content that is unverifiable, misleading,
        inappropriate, or privacy-invasive.
      </p>
      <h2>Account security</h2>
      <p>
        Keep your sign-in credentials private and notify the owner if you
        suspect unauthorized access. The service may suspend access needed to
        protect users, records, or legal compliance.
      </p>
      <h2>Responsible use</h2>
      <p>
        Never rely on Instant Seeker as a source of income. Set spending limits,
        do not chase losses, and use time-out or self-exclusion tools when
        betting stops being recreational.
      </p>
      <h2>Changes</h2>
      <p>
        The owner may update these terms with notice appropriate to the change.
        Continued use after an effective update indicates acceptance where
        permitted by law.
      </p>
    </LegalShell>
  );
}
