-- Run only against a disposable local Supabase database after all migrations:
--   supabase test db supabase/tests/referral_finance.sql
begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(26);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'partner1@example.test', crypt('test-password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', '{"display_name":"Partner One","momo_number":"+233241111111","age_confirmed":true,"terms_accepted":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'partner2@example.test', crypt('test-password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', '{"display_name":"Partner Two","momo_number":"+233242222222","age_confirmed":true,"terms_accepted":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'customer@example.test', crypt('test-password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', '{"display_name":"Referral Customer","momo_number":"+233243333333","age_confirmed":true,"terms_accepted":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'direct@example.test', crypt('test-password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', '{"display_name":"Direct Customer","momo_number":"+233244444444","age_confirmed":true,"terms_accepted":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'super-referral@example.test', crypt('test-password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', '{"display_name":"Referral Super","momo_number":"+233245555555","age_confirmed":true,"terms_accepted":true}', now(), now());

update public.profiles set role = 'sub_admin' where id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002'
);
update public.profiles set role = 'super_admin'
where id = '30000000-0000-4000-8000-000000000005';

select is(
  (select count(*) from public.sub_admin_referral_profiles),
  2::bigint,
  'each sub-admin receives a referral profile automatically'
);
select is(
  (select count(distinct lower(referral_code)) from public.sub_admin_referral_profiles),
  2::bigint,
  'generated referral codes are unique case-insensitively'
);

update public.sub_admin_referral_profiles set referral_enabled = false
where user_id = '30000000-0000-4000-8000-000000000002';
set local role service_role;
select is(
  public.capture_referral_attribution(
    (select referral_code from public.sub_admin_referral_profiles where user_id = '30000000-0000-4000-8000-000000000002'),
    repeat('b', 64), '/signup', null, now() + interval '30 days'
  ),
  null::jsonb,
  'disabled referral code creates no attribution'
);
reset role;
update public.sub_admin_referral_profiles set referral_enabled = true
where user_id = '30000000-0000-4000-8000-000000000002';

set local role service_role;
select ok(
  public.capture_referral_attribution(
    (select referral_code from public.sub_admin_referral_profiles where user_id = '30000000-0000-4000-8000-000000000001'),
    repeat('a', 64), '/signup', '30000000-0000-4000-8000-000000000003', now() + interval '30 days'
  ) is not null,
  'valid referral creates a registered-customer attribution'
);
select ok(
  public.capture_referral_attribution(
    (select referral_code from public.sub_admin_referral_profiles where user_id = '30000000-0000-4000-8000-000000000002'),
    repeat('a', 64), '/plans', '30000000-0000-4000-8000-000000000003', now() + interval '30 days'
  ) is not null,
  'a later valid click resolves without replacing first attribution'
);
select is(
  (select sub_admin_id from public.referral_attributions where user_id = '30000000-0000-4000-8000-000000000003'),
  '30000000-0000-4000-8000-000000000001'::uuid,
  'first valid sub-admin attribution is retained'
);
select is(
  public.capture_referral_attribution(
    (select referral_code from public.sub_admin_referral_profiles where user_id = '30000000-0000-4000-8000-000000000001'),
    repeat('c', 64), '/signup', '30000000-0000-4000-8000-000000000001', now() + interval '30 days'
  ),
  null::jsonb,
  'sub-admin self-referral creates no attribution'
);
reset role;

insert into public.signup_payments (
  user_id, provider_reference, amount_minor, currency, status,
  referral_attribution_id, referral_profile_id, referring_sub_admin_id,
  referral_code_snapshot, sub_admin_rate_basis_points,
  super_admin_rate_basis_points, net_profit_minor
)
select
  attribution.user_id, 'referral-payment-1', 5000, 'GHS', 'pending',
  attribution.id, attribution.referral_profile_id, attribution.sub_admin_id,
  attribution.referral_code_snapshot, attribution.commission_rate_basis_points,
  10000 - attribution.commission_rate_basis_points, 5000
from public.referral_attributions attribution
where attribution.user_id = '30000000-0000-4000-8000-000000000003';

set local role service_role;
select public.record_successful_signup_payment(
  '30000000-0000-4000-8000-000000000003', 'referral-payment-1', 5000, 'GHS', now()
);
select public.record_referral_commission_for_payment(
  'signup', 'referral-payment-1', 'charge.success:finance-test-1', 'finance-test-1', 0
);
select is(
  (select count(*) from public.referral_commission_ledger where entry_type = 'earning'),
  1::bigint,
  'one successful verified payment creates one earning'
);
select is(
  (select sub_admin_amount_minor from public.referral_commission_ledger where entry_type = 'earning'),
  3500::bigint,
  'GHS 50 profit creates GHS 35 sub-admin commission'
);
select is(
  (select super_admin_amount_minor from public.referral_commission_ledger where entry_type = 'earning'),
  1500::bigint,
  'GHS 50 profit creates GHS 15 super-admin share'
);
select public.record_referral_commission_for_payment(
  'signup', 'referral-payment-1', 'charge.success:finance-test-1', 'finance-test-1', 0
);
select is(
  (select count(*) from public.referral_commission_ledger where entry_type = 'earning'),
  1::bigint,
  'repeated payment webhook does not duplicate earning'
);

insert into public.signup_payments (
  user_id, provider_reference, amount_minor, currency, status, net_profit_minor
) values (
  '30000000-0000-4000-8000-000000000004', 'direct-payment-1', 5000, 'GHS', 'pending', 5000
);
select public.record_successful_signup_payment(
  '30000000-0000-4000-8000-000000000004', 'direct-payment-1', 5000, 'GHS', now()
);
select is(
  public.record_referral_commission_for_payment(
    'signup', 'direct-payment-1', 'charge.success:direct-1', 'direct-1', 0
  ),
  null::uuid,
  'direct non-referred payment creates no commission'
);

select public.record_referral_commission_reversal(
  'referral-payment-1', 2500, 'GHS', 'refund.processed:finance-refund-1', 'refund_reversal'
);
select is(
  (select count(*) from public.referral_commission_ledger where entry_type = 'refund_reversal'),
  1::bigint,
  'partial processed refund creates one linked reversal'
);
select is(
  (select sub_admin_amount_minor from public.referral_commission_ledger where entry_type = 'refund_reversal'),
  (-1750)::bigint,
  'partial refund proportionally reverses sub-admin commission'
);
select public.record_referral_commission_reversal(
  'referral-payment-1', 2500, 'GHS', 'refund.processed:finance-refund-1', 'refund_reversal'
);
select is(
  (select count(*) from public.referral_commission_ledger where entry_type = 'refund_reversal'),
  1::bigint,
  'repeated refund webhook does not duplicate reversal'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.referral_commission_ledger),
  2::bigint,
  'sub-admin can read only their own earning and reversal'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.referral_commission_ledger),
  0::bigint,
  'sub-admin cannot read another partner ledger'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);
select lives_ok(
  $$select public.admin_record_referral_payout(
    (select id from public.sub_admin_referral_profiles where user_id = '30000000-0000-4000-8000-000000000001'),
    'GHS', 1000, 'Mobile Money', 'MOMO-REFERRAL-PAYOUT-1', 'Integration payout', now(),
    'Verified external payout test', '{}'::jsonb
  )$$,
  'super-admin can record a payout within available balance'
);
select is(
  (select sum(amount_minor) from public.referral_payout_allocations),
  1000::bigint,
  'recorded payout allocates commission exactly once'
);
select is(
  (
    select sum(sub_admin_amount_minor)
      - (select coalesce(sum(amount_minor), 0) from public.referral_payout_allocations)
    from public.referral_commission_ledger
  ),
  750::bigint,
  'recording payout reduces amount currently owed'
);
select throws_ok(
  $$select public.admin_record_referral_payout(
    (select id from public.sub_admin_referral_profiles where user_id = '30000000-0000-4000-8000-000000000001'),
    'GHS', 1000, 'Mobile Money', 'MOMO-REFERRAL-PAYOUT-2', 'Overpay attempt', now(),
    'Payout beyond remaining balance', '{}'::jsonb
  )$$,
  null,
  'payout cannot exceed remaining available balance'
);
select ok(
  exists (
    select 1 from public.admin_audit_logs
    where action = 'referral_payout.recorded'
  ),
  'payout creates an immutable audit event'
);
select lives_ok(
  $$select public.admin_cancel_referral_payout(
    (select id from public.referral_payouts where external_reference = 'MOMO-REFERRAL-PAYOUT-1'),
    'Incorrect external payout record', '{}'::jsonb
  )$$,
  'super-admin can cancel an incorrectly recorded payout'
);
select is(
  (select status from public.referral_payouts where external_reference = 'MOMO-REFERRAL-PAYOUT-1'),
  'cancelled'::text,
  'cancelled payout remains in immutable history'
);
select is(
  (
    select sum(sub_admin_amount_minor)
      - coalesce((
          select sum(allocation.amount_minor)
          from public.referral_payout_allocations allocation
          join public.referral_payouts payout on payout.id = allocation.payout_id
          where payout.status = 'paid'
        ), 0)
    from public.referral_commission_ledger
  ),
  1750::bigint,
  'cancelling a payout releases its amount back to the available ledger balance'
);
select ok(
  exists (
    select 1 from public.admin_audit_logs
    where action = 'referral_payout.cancelled'
  ),
  'payout cancellation creates an immutable audit event'
);

select * from finish();
rollback;
