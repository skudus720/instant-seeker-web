# Supabase setup

1. Create a Supabase project and run the SQL migration in `migrations/` with the Supabase CLI (`supabase db push`) or SQL editor.
2. Add the project URL and public publishable/anonymous key to `.env.local`. Never place a service-role key in a `NEXT_PUBLIC_` variable.
3. Keep the `win-records` bucket private. The legacy `analysis-screenshots` bucket must also remain private until any old objects are purged; new analysis requests do not write screenshots to Storage.
4. Bootstrap the first super administrator from the SQL editor or another trusted service-role context:

   ```sql
   select public.bootstrap_first_super_admin('<authenticated-user-uuid>'::uuid);
   ```

   The function is service-role only, can run once, and creates the bootstrap audit event. Do not expose the service-role key or perform this operation from browser code.

5. Set `NEXT_PUBLIC_DEMO_MODE=false` only after the migration and authentication settings are ready.

6. Run application tests with `npm test`. For a disposable local database, run:

   ```bash
   supabase start
   supabase db reset
   supabase test db supabase/tests/admin_rls.sql
   supabase test db supabase/tests/referral_finance.sql
   ```

7. Apply `202607110010_transient_screenshot_processing.sql`. If the project previously retained analysis images, run `npm run purge:analysis-images` once with server-only Supabase credentials. Win-record evidence remains private and opens only through a short-lived, server-authorized signed URL.

No sample winner or review rows are included. Public statistics remain zero until genuine records satisfy verification, consent, publication, and non-demo rules. Audit records are append-only through normal authenticated interfaces.

## Referral finance migrations

`202607110008_referral_finance.sql` adds the `sub_admin` role, random referral-code profiles, first-touch click/attribution records, immutable integer-minor-unit commission and payout tables, indexes, and owner/super-admin RLS policies. `202607110009_referral_functions.sql` adds trusted capture, claim, earning, reversal, FIFO payout, cancellation, adjustment, audit, and aggregate functions. `202607110011_referral_partner_dashboard.sql` adds service-role-only package, 30-day, and payment-status aggregates for the sub-admin dashboard.

Set `REFERRAL_ATTRIBUTION_SECRET` to at least 32 random characters in the server secret manager. Keep the default attribution and hold periods explicit with `REFERRAL_ATTRIBUTION_DAYS` and `REFERRAL_COMMISSION_HOLD_DAYS`. These variables must never use a `NEXT_PUBLIC_` prefix.

Promote sub-admins only through the authenticated super-admin Users workflow. The role trigger generates or restores their referral profile and the migration backfills any existing `sub_admin` profiles. A demotion disables the current code while preserving all historical attribution, ledger, and payout records.

The SQL integration test creates disposable Auth users and financial records. Run it only after `supabase db reset` against a local or isolated staging database, never production.
