# Instant Seeker

Instant Seeker is an independent AI-assisted virtual-match screenshot analysis application. It provides probability estimates, confidence indicators, risk notes, and private analysis history. It does not accept bets, handle gambling funds, guarantee results, or access private betting-platform systems.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app enters clearly labeled demonstration mode when Supabase or an analysis provider is not configured. Demo uploads are normalized in memory, are not stored, and return deterministic format-only output that performs no OCR.

## Environment

Set these public values in `.env.local`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DISPLAY_CURRENCY=GHS
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

The service-role key is required for server-authored analysis records and must never be exposed to browser code. Server-only provider and rate-limit credentials must never use the `NEXT_PUBLIC_` prefix. All supported names are documented in `.env.example`.

## Supabase

1. Create a Supabase project.
2. Install and authenticate the Supabase CLI if you use migrations locally.
3. Apply `supabase/migrations/202607100001_initial_instant_seeker.sql` with `supabase db push` or the SQL editor.
4. Confirm the `analysis-screenshots` and `win-records` buckets are private.
5. Create a user, then promote an administrator with a trusted SQL operation as described in `supabase/README.md`.
6. Set `NEXT_PUBLIC_DEMO_MODE=false` only after authentication and the migration are ready.

The migration enables row-level security, owner-only private analyses, server-authorized moderation, sanitized public review functions, verified-only statistics, and a privacy-safe realtime winner projection. It intentionally includes no sample winners, amounts, activity, or reviews.

## Ticket image

No genuine winning-ticket image was found in the supplied repository. The homepage therefore shows an honest empty state. To add an owner-approved image later, place a privacy-safe PNG at:

```text
public/images/winning-ticket.png
```

Crop or redact names, phone numbers, account identifiers, ticket IDs, booking codes, and barcodes before publication. The UI applies additional visual privacy masks but should not replace source-image redaction.

## Analysis provider

When canvas APIs are available, the browser re-encodes screenshots before upload to remove embedded metadata and constrain the longest edge to 2,000 pixels. The server independently checks the actual file signature before private storage.

`src/lib/analysis/provider.ts` defines the server-only `AnalysisProvider` interface. A production adapter must:

- accept an authenticated user ID and private image reference;
- retrieve the image through authorized server infrastructure;
- return the shared validated analysis schema;
- expose no model keys or private storage URLs to browser code;
- avoid scraping, automating, or reverse engineering a betting platform;
- communicate uncertainty and avoid guaranteed-outcome language.

Register the approved adapter in `src/lib/analysis/index.ts`. Until then, the deterministic demo provider remains active and visibly labels every result.

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

Legal and policy copy is a product-ready draft, not jurisdiction-specific legal advice. Review the Terms, Privacy Policy, contact address, data-retention schedule, age-gating obligations, and responsible-gambling resources with qualified counsel before launch.
