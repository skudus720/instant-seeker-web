# Instant Seeker

Instant Seeker is an independent AI-assisted virtual-match screenshot analysis application. It provides probability estimates, confidence indicators, risk notes, and private analysis history. It does not accept bets, handle gambling funds, guarantee results, or access private betting-platform systems.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app enters clearly labeled demonstration mode when Supabase or an analysis provider is not configured. Demo uploads are normalized in memory, are not stored, and return deterministic format-only output that performs no OCR. Users may add optional visible fixture notes; in demo mode those notes are always labeled as user-provided context.

## Environment

Set these public values in `.env.local`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DISPLAY_CURRENCY=GHS
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SIGNUP_FEE_GHS=50
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
PAYSTACK_SECRET_KEY=YOUR_SERVER_ONLY_PAYSTACK_SECRET_KEY
REFERRAL_ATTRIBUTION_SECRET=GENERATE_AT_LEAST_32_RANDOM_CHARACTERS
REFERRAL_ATTRIBUTION_DAYS=30
REFERRAL_COMMISSION_HOLD_DAYS=0
```

The service-role key is required for server-authored analysis records and must never be exposed to browser code. Server-only provider and rate-limit credentials must never use the `NEXT_PUBLIC_` prefix. All supported names are documented in `.env.example`.

## Supabase

1. Create a Supabase project.
2. Install and authenticate the Supabase CLI if you use migrations locally.
3. Apply every migration in `supabase/migrations/` with `supabase db push` or the SQL editor.
4. Confirm the `win-records` bucket is private. The legacy `analysis-screenshots` bucket must also remain private until any existing objects are purged.
5. Create a user, then bootstrap the first super administrator with the one-time service-role-only function described below.
6. Set `NEXT_PUBLIC_DEMO_MODE=false` only after authentication and the migration are ready.

## Administration

The protected `/admin` application extends the existing App Router and Supabase architecture rather than introducing a second authentication system. It includes:

- Dashboard metrics, charts, recent audit activity, and redacted errors
- Server-paginated Users, Analyses, Win Records, and Reviews workflows
- Versioned Public Content and AI Configuration
- Sanitized operational reports and audited CSV exports
- System Health, append-only Audit Logs, and categorized Settings
- Permission-filtered navigation, mobile drawer, command search, notifications, breadcrumbs, loading skeletons, and accessible reason-confirmation dialogs

The roles are `user`, `sub_admin`, `admin`, and `super_admin`. A `sub_admin` has a private referral workspace but no operational-admin access. `admin` handles normal operations and moderation. `super_admin` additionally changes staff roles, manages referral partners and payouts, activates production AI versions, changes sensitive settings and feature flags, handles stale jobs, and sees sensitive audit metadata.

For local visual review without a Supabase project, start the development server with `ADMIN_DEMO_PREVIEW=true`. This renders honest empty states and disables mutations. The flag is ignored in production, where an authenticated active staff profile is always required.

Authorization is checked in three layers:

1. `requireAdmin()`, `requireSuperAdmin()`, and `requirePermission()` validate the authenticated server session and current account status before protected content renders.
2. Each server action validates its exact permission and Zod schema before calling a narrow database RPC.
3. Supabase RLS and security-definer RPCs re-check the database role. A client-supplied role or user ID is never trusted.

A suspended administrator loses access on the next request and is denied by both the application helper and `public.is_admin()`. Role changes are super-admin only, and an administrator cannot change their own role.

### First super administrator

Create and verify the account normally, locate its Auth user UUID, then run this once from the Supabase SQL editor or another trusted service-role context:

```sql
select public.bootstrap_first_super_admin('<authenticated-user-uuid>'::uuid);
```

The function is executable only by `service_role`, refuses to run after any super administrator exists, verifies the profile, and writes the initial audit event. Do not use a browser request, public API key, or direct ad hoc role update for bootstrap.

After bootstrap, staff role changes must use the super-admin Users workflow. Administrators cannot promote themselves.

### Admin migrations and RLS tests

Apply migrations in filename order:

```bash
supabase db push
```

The admin migrations add operational metadata, integer minor-unit amounts, private signed evidence access, versioned content/configuration, queue records, settings, system events, append-only audits, indexes, policies, and transactional mutation RPCs. They do not add sample winners, reviews, or production statistics.

Run application security contracts with `npm test`. Against a disposable local Supabase stack, run the database integration test:

```bash
supabase start
supabase db reset
supabase test db supabase/tests/admin_rls.sql
supabase test db supabase/tests/referral_finance.sql
```

The SQL test verifies cross-user analysis isolation, private buckets, public review and win eligibility, demo exclusion, duplicate retry protection, audit creation, role boundaries, and immediate suspended-admin denial. Never run the fixture test against production.

### Private evidence and exports

New analysis screenshots are processed in request memory and are never written to object storage. Only structured reports and non-image processing metadata are retained. Ticket evidence and any legacy analysis screenshots remain in private buckets; admin list pages never preload them, and legacy detail views require a short-lived server-authorized signed URL.

User privacy exports, analysis diagnostics, and report CSVs require a reason and create an audit event. Diagnostics recursively redact account identifiers, phone/email patterns, private paths, tokens, and authorization data. Report exports omit review text, private image paths, signed URLs, secrets, and user identifiers.

### Public verification

A win record reaches public activity only when all of these are true:

- `verification_status = 'published'`
- verification and publication timestamps exist
- user consent and its timestamp are recorded
- the record is not demo/sample data
- a privacy-safe public name is used

Rejected, unpublished, non-consented, deleted, hidden, and demo records do not contribute to public activity or verified totals. Review text and ratings remain immutable; an optional privacy-redacted body is stored separately, and only approved non-demo reviews are public.

### Versioned content and AI settings

Public Content creates immutable draft JSON versions. Publishing archives the current version, records the administrator and reason, and makes only the new published version available through `get_public_content()`. The homepage consumes published hero, ticker, how-it-works, review visibility, CTA, banners, support, and footer content with safe code fallbacks.

AI Configuration stores no API keys. It versions provider/model identifiers, prompt instructions, probability and risk thresholds, MIME/size/match limits, timeouts, retry limits, daily limits, feature flags, and notes. Drafts are server-validated. Only a super administrator can activate or roll back production configuration, and each activation is audited. New analyses record the active version and pass its non-secret settings to the server-side adapter.

Because new screenshots are discarded, a new upload is required for a fresh analysis. Legacy retained screenshots may be retried once through the duplicate-safe server processor and are permanently deleted immediately afterward. Retry output is stored separately and never silently overwrites the original model output. An administrator can add a separately labeled correction with a required reason.

## Signup payment

New production accounts require a one-time GHS 50 platform-access payment. The account is created with `payment_pending` access, Paystack Standard Checkout collects Mobile Money or card details, and access changes to `active` only after a server-side verification or a valid signed webhook.

Signup also requires a Ghana Mobile Money number. It is normalized to E.164 format and stored only on the private profile for account and payment matching; Mobile Money PINs and approval codes are never collected by the application.

1. Add `PAYSTACK_SECRET_KEY` to the server environment. Never use a `NEXT_PUBLIC_` variable for it.
2. Set the Paystack webhook URL to `https://YOUR_DOMAIN/api/payments/paystack/webhook`.
3. Keep `NEXT_PUBLIC_SIGNUP_FEE_GHS=50` aligned with the GHS 50 check in `202607110001_signup_payments.sql`.
4. Test with Paystack test credentials before switching to a live key.

The fee is for software access only. Instant Seeker does not accept bets, betting deposits, stakes, or gambling funds. In demo mode no account is stored and no payment is collected.

## AI access plans

After the GHS 50 account payment is verified, members can open `/plans` and purchase a time-limited AI analysis pass through Paystack:

- Gold: GHS 350 for 24 hours
- Platinum: GHS 850 for 48 hours
- Diamond: GHS 1,500 for 72 hours

Plan transactions are initialized on the server and activated only after strict Paystack verification or a valid signed webhook. Purchasing another plan before the current one expires preserves the remaining time and schedules the new duration after it. Plans do not renew automatically. Apply `202607110003_ai_subscriptions.sql` before enabling live plan checkout.

Members can update their display name and Ghana Mobile Money number from `/profile`. Apply `202607110004_profile_updates.sql` to grant the owner-scoped update fields and add profile update timestamps. Email and password changes intentionally remain in separate verified authentication flows.

## Sub-admin referrals and commission

For local UI testing without Supabase, enable the development-only sub-admin
preview with `LOCAL_SUB_ADMIN_PREVIEW=true`, set a test username and password,
and provide a random `LOCAL_SUB_ADMIN_SESSION_SECRET` of at least 32 characters.
The test session uses a signed HTTP-only cookie, is ignored in production, and
shows explicitly labeled empty demo data. Production sub-admins must use normal
Supabase authentication and strong passwords.

Apply `202607110008_referral_finance.sql`, `202607110009_referral_functions.sql`, and `202607110011_referral_partner_dashboard.sql` after the existing payment and admin migrations. The dashboard migration adds service-role-only package, 30-day, and payment-status aggregates; it does not create editable or sample statistics. Promote a user to `sub_admin` through the super-admin Users workflow. The database trigger creates a random, case-insensitive unique referral code automatically and safely backfills existing sub-admins. Only a super administrator can enable or disable referrals, regenerate a code, create an adjustment, record a payout, or cancel an incorrect payout record.

Canonical links use the configured `NEXT_PUBLIC_APP_URL`:

```text
https://YOUR_DOMAIN/r/UNIQUE_CODE
https://YOUR_DOMAIN/?ref=UNIQUE_CODE
```

The server validates the active code, records a privacy-safe click, and stores an HMAC-signed, HTTP-only first-touch cookie. Attribution lasts 30 days by default and is not overwritten by a later valid code. Registration claims the attribution and checkout snapshots the referral profile, code, and basis-point rate. Disabled, suspended, expired, unknown, and self-referrals create no qualifying attribution or commission.

### Profit and ledger rules

This repository had no pre-existing discount, processing-fee, or direct-cost calculation. Its current profit definition is therefore the full settled payment amount. The migration adds integer minor-unit snapshots for gross amount, discounts, fees, direct cost, refunds, and net profit so an existing cost model can be connected later without changing historical entries.

For a positive verified profit, the ledger stores a 7,000 basis-point sub-admin amount and calculates the 3,000 basis-point super-admin share as the exact remainder. This guarantees that both shares equal profit. All Paystack funds continue settling into the platform account; no provider split or connected payout is created.

Only the HMAC-verified Paystack webhook creates commission. `charge.success` creates at most one earning through unique payment and event constraints. Server-verified redirect callbacks may activate purchased access, but never create commission. Final `refund.processed` events and resolved `merchant-accepted` disputes create linked, capped negative entries; original earnings and payouts are never deleted. A reversal after payout becomes a recoverable balance that offsets future commission.

`REFERRAL_COMMISSION_HOLD_DAYS` controls when a pending earning becomes payable. Pending earnings and their linked reversals move into available accounting together. Balances are grouped by currency and derived from ledger entries minus paid payout allocations.

### Manual payouts

After sending money externally, a super administrator opens `/admin/referrals/{partner-id}` and records the currency, amount, method, reference, date, notes, and reason. The transaction locks the referral profile, rejects pending or non-positive balances, prevents overpayment, and allocates the oldest available positive ledger entries first. An incorrectly recorded payout can be cancelled with a required reason; its row and allocations remain in history, its paid allocation is released, and both actions are audited.

Sub-admins use `/referrals` to copy their link and view only their own masked customer activity, currency-separated balances, reversals, and payouts. Super administrators use `/admin/referrals` for aggregate metrics, partner controls, ledger detail, adjustments, and manual payout records.

### Referral verification

1. Promote a staging account to `sub_admin` from the super-admin Users page and confirm `/referrals` shows a unique active link.
2. Open that link in a private browser, register a different account, and complete a Paystack test payment.
3. Deliver the signed `charge.success` webhook and confirm one 70/30 earning appears on both dashboards.
4. Redeliver the same event and confirm no duplicate entry appears.
5. Send a processed partial-refund test event and confirm a linked proportional reversal.
6. Record a payout below the available balance, then confirm the partner balance and payout history update.
7. Cancel the test payout and confirm the immutable record becomes `cancelled`, the balance is restored, and an audit event exists.
8. Disable the partner code and confirm new visits no longer create attribution.

The migrations enable row-level security, owner-only private analyses, verified subscription access, server-authorized moderation, sanitized public review functions, verified-only statistics, and a privacy-safe realtime winner projection. They intentionally include no sample winners, amounts, activity, or reviews.

## Ticket image

No genuine winning-ticket image was found in the supplied repository. The homepage therefore shows an honest empty state. To add an owner-approved image later, place a privacy-safe PNG at:

```text
public/images/winning-ticket.png
```

Crop or redact names, phone numbers, account identifiers, ticket IDs, booking codes, and barcodes before publication. The UI applies additional visual privacy masks but should not replace source-image redaction.

## Analysis provider

When canvas APIs are available, the browser re-encodes screenshots before processing to remove embedded metadata and constrain the longest edge to 2,000 pixels. The server independently checks the actual file signature, passes the bytes directly to the configured provider, and clears its working buffer after success or failure. The image is never written to application object storage.

`src/lib/analysis/provider.ts` defines the server-only `AnalysisProvider` interface. A production adapter must:

- accept an authenticated user ID and transient image bytes;
- process the image only for the active request and support a no-retention policy;
- return the shared validated analysis schema;
- expose no model keys or private storage URLs to browser code;
- avoid scraping, automating, or reverse engineering a betting platform;
- communicate uncertainty and avoid guaranteed-outcome language.

Set `ANALYSIS_PROVIDER=remote-http` with `ANALYSIS_PROVIDER_ENDPOINT` and `ANALYSIS_PROVIDER_API_KEY` to call a trusted server-side analysis service that can retrieve private images through authorized infrastructure. Until then, the deterministic demo provider remains active and visibly labels every result.

For `team-selections` responses, the provider may choose a supported subset of the fixtures it detects and may abstain on unclear fixtures. Each `selectedTeam` must be a team name visibly present in its corresponding `fixture`; skipped fixtures omit `selectedTeam`. The compact Virtuals AI result shows only those selected team names and the uncertainty notice.

The real provider remains the external integration boundary: the repository validates its output and enforces timeout/configuration limits, but deployment owners must supply an authorized image-analysis service. That service must not scrape, automate, bypass, attack, or obtain private data from any betting platform.

## Rate limiting

The development fallback is process-local. Production should configure a distributed rate limiter with the `RATE_LIMIT_PROVIDER`, `RATE_LIMIT_API_URL`, and `RATE_LIMIT_API_TOKEN` server variables. Authentication and analysis entry points already call the integration hook.

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Production deployment checklist

1. Apply every migration and run the RLS test against a disposable staging database.
2. Bootstrap exactly one first super administrator, then verify role changes through the UI.
3. Keep `SUPABASE_SERVICE_ROLE_KEY`, Paystack keys, analysis-provider keys, and rate-limit tokens in the deployment secret manager without `NEXT_PUBLIC_` prefixes.
4. Confirm the ticket-evidence and legacy screenshot buckets are private, then run `npm run purge:analysis-images` once if the deployment contains old analysis screenshots.
5. Configure a distributed rate limiter and HTTPS-only analysis-provider endpoint.
6. Set `NEXT_PUBLIC_DEMO_MODE=false`, `NEXT_PUBLIC_APP_URL`, `APP_VERSION`, and the production currency deliberately.
7. Verify Paystack webhooks, account access, AI subscriptions, privacy exports, audit creation, and public-consent gates in staging.
8. Review legal, retention, responsible-gaming, support-resource, and contact content with qualified counsel before launch.

Legal and policy copy is a product-ready draft, not jurisdiction-specific legal advice. Review the Terms, Privacy Policy, contact address, data-retention schedule, age-gating obligations, and responsible-gambling resources with qualified counsel before launch.
