import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Your screenshots are processed, then discarded"
      intro="This launch-ready policy describes the intended data handling in the supplied application. The owner should review it with qualified counsel before production launch."
    >
      <h2>Information we collect</h2>
      <p>
        We process account details such as display name, email, and a private
        Mobile Money number, along with age and terms confirmations, analysis
        results, security logs, and any reviews or win records that you choose
        to submit. Screenshot content is processed transiently for the requested
        analysis and is not retained by Instant Seeker.
      </p>
      <h2>How screenshots are used</h2>
      <p>
        Screenshots are validated and held only in request memory while the
        requested analysis runs. Instant Seeker does not write new analysis
        screenshots to database or object storage, and clears its working image
        buffer after success or failure. Only the structured report and basic
        non-image processing metadata remain. Personal account details should
        still be cropped before upload.
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
        records, realtime activity, and private user-submitted evidence, and
        Paystack for payment authorization and verification. Instant Seeker does
        not collect Mobile Money PINs or payment approval codes. A configured
        image-analysis provider receives the screenshot only for the active
        request and must contractually support no-retention processing before
        production use.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Analysis screenshots have no application retention period because they
        are discarded after processing. The service owner should configure a
        documented retention schedule for structured reports and account data.
        Account owners should be able to request deletion of their analyses,
        profile, and unpublished submissions, subject to lawful fraud-prevention
        or audit requirements.
      </p>
      <p>
        Private subscription records include the selected plan, provider
        reference, payment status, amount, activation time, and expiry time.
        They are available only to the member and authorized administrators.
      </p>
      <h2>Security</h2>
      <p>
        Access is enforced through server authorization and database row-level
        security. No security measure is absolute, so production monitoring,
        incident response, backups, and secret rotation remain required.
      </p>
      <p>
        Signed-in members may update their display name and private Mobile Money
        number. Email and password changes use separate verified authentication
        flows. Profile updates are validated on the server and restricted to the
        account owner.
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
