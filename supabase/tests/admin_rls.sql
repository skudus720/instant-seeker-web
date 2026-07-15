-- Run against a disposable local Supabase database after all migrations:
--   supabase test db supabase/tests/admin_rls.sql
begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'owner@example.test', crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Owner Test","momo_number":"+233241111111","age_confirmed":true,"terms_accepted":true}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'other@example.test', crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Other Test","momo_number":"+233242222222","age_confirmed":true,"terms_accepted":true}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'admin@example.test', crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Admin Test","momo_number":"+233243333333","age_confirmed":true,"terms_accepted":true}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated', 'super@example.test', crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Super Test","momo_number":"+233244444444","age_confirmed":true,"terms_accepted":true}',
    now(), now()
  );

update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000003';
update public.profiles set role = 'super_admin' where id = '10000000-0000-0000-0000-000000000004';

select ok(
  not exists (select 1 from storage.buckets where id in ('analysis-screenshots', 'win-records') and public),
  'private evidence buckets are not public'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_logs', 'INSERT')
  and not has_table_privilege('authenticated', 'public.admin_audit_logs', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.admin_audit_logs', 'DELETE'),
  'audit logs are append-only through trusted RPCs'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.analyses (
  id, user_id, private_image_path, provider, status
) values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001/test.png',
  'deterministic-demo', 'completed'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.analyses where id = '20000000-0000-0000-0000-000000000001'),
  0::bigint,
  'RLS prevents cross-user analysis reads'
);

select is(
  (
    with deleted as (
      delete from public.analyses
      where id = '20000000-0000-0000-0000-000000000001'
      returning id
    )
    select count(*) from deleted
  ),
  0::bigint,
  'a different user cannot delete a private analysis'
);

reset role;
insert into public.reviews (
  user_id, rating, body, original_body, moderation_status, published_at, is_sample
) values
  ('10000000-0000-0000-0000-000000000001', 5, 'Approved genuine review for database policy testing.', 'Approved genuine review for database policy testing.', 'approved', now(), false),
  ('10000000-0000-0000-0000-000000000002', 1, 'Pending review that must remain absent from public results.', 'Pending review that must remain absent from public results.', 'pending', null, false),
  ('10000000-0000-0000-0000-000000000002', 5, 'Demo review that must not affect genuine public activity.', 'Demo review that must not affect genuine public activity.', 'approved', now(), true);

select is((select count(*) from public.get_public_reviews()), 1::bigint, 'only approved non-demo reviews are public');

insert into public.win_records (
  user_id, amount, amount_minor, currency, verification_status,
  consent_to_publish, consent_recorded_at, verified_at, published_at,
  won_at, is_sample, privacy_safe_public_name
) values
  ('10000000-0000-0000-0000-000000000001', 100, 10000, 'GHS', 'published', true, now(), now(), now(), now(), false, 'Owner T.'),
  ('10000000-0000-0000-0000-000000000002', 9000, 900000, 'GHS', 'published', false, null, now(), now(), now(), false, 'Other T.'),
  ('10000000-0000-0000-0000-000000000002', 8000, 800000, 'GHS', 'published', true, now(), now(), now(), now(), true, 'Demo T.');

select is((select count(*) from public.public_win_activity), 1::bigint, 'only verified, consented, published, non-demo wins are public');
select is((select verified_winners from public.get_public_stats('GHS')), 1::bigint, 'demo and non-consented records do not affect verified totals');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.admin_queue_analysis_retry('20000000-0000-0000-0000-000000000001', true, 'Retry integration test', '{}'::jsonb)$$,
  'administrator can queue one retry'
);
select throws_ok(
  $$select public.admin_queue_analysis_retry('20000000-0000-0000-0000-000000000001', true, 'Duplicate retry integration test', '{}'::jsonb)$$,
  null,
  'duplicate active retry is rejected'
);
select ok(
  exists (select 1 from public.admin_audit_logs where action = 'analysis.retry_queued'),
  'sensitive retry creates an audit event'
);
select throws_ok(
  $$select public.admin_manage_user('10000000-0000-0000-0000-000000000002', 'change_role', 'admin', 'Unauthorized promotion test', '{}'::jsonb)$$,
  null,
  'standard admin cannot change roles'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.admin_manage_user('10000000-0000-0000-0000-000000000002', 'change_role', 'admin', 'Authorized promotion test', '{}'::jsonb)$$,
  'super admin can change another user role'
);
select throws_ok(
  $$select public.admin_manage_user('10000000-0000-0000-0000-000000000004', 'change_role', 'user', 'Self demotion test', '{}'::jsonb)$$,
  null,
  'super admin cannot change their own role'
);

reset role;
update public.profiles
set account_status = 'suspended', suspended_until = now() + interval '1 day'
where id = '10000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is(public.is_admin(), false, 'suspended administrator loses access immediately');

select * from finish();
rollback;
