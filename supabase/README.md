# Supabase setup

1. Create a Supabase project and run the SQL migration in `migrations/` with the Supabase CLI (`supabase db push`) or SQL editor.
2. Add the project URL and public publishable/anonymous key to `.env.local`. Never place a service-role key in a `NEXT_PUBLIC_` variable.
3. Keep both `analysis-screenshots` and `win-records` buckets private. The migration creates them and their owner/admin policies.
4. Promote the first administrator with a trusted server-side SQL operation:

   ```sql
   update public.profiles set role = 'admin' where id = '<authenticated-user-uuid>';
   ```

5. Set `NEXT_PUBLIC_DEMO_MODE=false` only after the migration and authentication settings are ready.

No sample winner or review rows are included. Public statistics remain zero until genuine records are verified or approved.
