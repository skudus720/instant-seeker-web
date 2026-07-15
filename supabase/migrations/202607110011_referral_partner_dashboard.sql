begin;

create index if not exists signup_payments_referral_status_created_idx
  on public.signup_payments(referral_profile_id, status, created_at desc)
  where referral_profile_id is not null;

create index if not exists ai_subscriptions_referral_status_created_idx
  on public.ai_subscriptions(referral_profile_id, status, created_at desc)
  where referral_profile_id is not null;

create or replace function public.referral_partner_dashboard_analytics(
  p_referral_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'trusted server authorization required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.sub_admin_referral_profiles
    where id = p_referral_profile_id
  ) then
    raise exception 'referral profile not found';
  end if;

  select jsonb_build_object(
    'recent_transactions_30_days', (
      select count(*)::bigint
      from public.referral_commission_ledger ledger
      where ledger.referral_profile_id = p_referral_profile_id
        and ledger.entry_type = 'earning'
        and ledger.created_at >= now() - interval '30 days'
    ),
    'package_analytics', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_code', package.product_code,
          'currency', package.currency,
          'count', package.purchase_count,
          'revenue_minor', package.revenue_minor
        )
        order by package.product_code, package.currency
      )
      from (
        select lower(ledger.product_code) as product_code,
          ledger.currency,
          count(*)::bigint as purchase_count,
          sum(ledger.gross_amount_minor)::bigint as revenue_minor
        from public.referral_commission_ledger ledger
        where ledger.referral_profile_id = p_referral_profile_id
          and ledger.entry_type = 'earning'
          and ledger.product_code is not null
        group by lower(ledger.product_code), ledger.currency
      ) package
    ), '[]'::jsonb),
    'payment_status', jsonb_build_object(
      'failed',
        (select count(*)::bigint from public.signup_payments payment
          where payment.referral_profile_id = p_referral_profile_id
            and payment.status = 'failed')
        +
        (select count(*)::bigint from public.ai_subscriptions payment
          where payment.referral_profile_id = p_referral_profile_id
            and payment.status = 'failed'),
      'completed',
        (select count(*)::bigint
          from public.referral_commission_ledger ledger
          where ledger.referral_profile_id = p_referral_profile_id
            and ledger.entry_type = 'earning'),
      'pending',
        (select count(*)::bigint from public.signup_payments payment
          where payment.referral_profile_id = p_referral_profile_id
            and payment.status = 'pending')
        +
        (select count(*)::bigint from public.ai_subscriptions payment
          where payment.referral_profile_id = p_referral_profile_id
            and payment.status = 'pending')
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.referral_partner_dashboard_analytics(uuid)
  from public, anon, authenticated;
grant execute on function public.referral_partner_dashboard_analytics(uuid)
  to service_role;

commit;
