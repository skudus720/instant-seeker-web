import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Your screenshots stay private"
      intro="This launch-ready policy describes the intended data handling in the supplied application. The owner should review it with qualified counsel before production launch."
    >
      <h2>Information we collect</h2>
      <p>
        We process account details such as display name and email, age and terms
        confirmations, uploaded screenshots, analysis results, security logs,
        and any reviews or win records that you choose to submit.
      </p>
      <h2>How screenshots are used</h2>
      <p>
        Screenshots are stored in a private bucket and referenced by
        account-scoped paths. They are used to provide the requested analysis
        and are not published as testimonials or winner activity. Personal
        account details should be cropped before upload.
      </p>
      <h2>Public content</h2>
      <p>
        Only approved reviews and verified, privacy-safe win activity may appear
        publicly. Email addresses, phone numbers, account IDs, private ticket
        paths, and raw analysis uploads are excluded from public queries.
      </p>
      <h2>Service providers</h2>
      <p>
        The application is designed to use Supabase for authentication, database
        records, realtime activity, and private image storage. A future
        image-analysis provider must receive only secure server-side references
        and must be assessed before launch.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        The service owner should configure a documented retention schedule.
        Account owners should be able to request deletion of their private
        analyses, screenshots, profile, and unpublished submissions, subject to
        lawful fraud-prevention or audit requirements.
      </p>
      <h2>Security</h2>
      <p>
        Access is enforced through server authorization and database row-level
        security. No security measure is absolute, so production monitoring,
        incident response, backups, and secret rotation remain required.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy requests can be directed to{" "}
        <a href={`mailto:${appConfig.contactEmail}`}>
          {appConfig.contactEmail}
        </a>
        . Replace this placeholder address before launch.
      </p>
    </LegalShell>
  );
}
