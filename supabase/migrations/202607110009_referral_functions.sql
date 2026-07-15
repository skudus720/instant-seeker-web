-- Trusted referral operations, accounting RPCs, and read models.

create or replace function public.capture_referral_attribution(
  p_referral_code text,
  p_visitor_token_hash text,
  p_landing_page text,
  p_user_id uuid default null,
  p_expires_at timestamptz default now() + interval '30 days'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate public.sub_admin_referral_profiles%rowtype;
  v_existing public.referral_attributions%rowtype;
  v_id uuid;
  v_repeat boolean;
begin
  if coalesce(p_referral_code, '') !~* '^[a-z0-9_-]{10,32}$'
    or coalesce(p_visitor_token_hash, '') !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now()
    or char_length(coalesce(p_landing_page, '')) not between 1 and 500 then
    return null;
  end if;

  select referral.* into v_candidate
  from public.sub_admin_referral_profiles referral
  join public.profiles profile on profile.id = referral.user_id
  where lower(referral.referral_code) = lower(p_referral_code)
    and referral.referral_enabled = true
    and profile.role = 'sub_admin'
    and profile.deleted_at is null
    and (
      profile.account_status = 'active'
      or (
        profile.account_status = 'suspended'
        and profile.suspended_until is not null
        and profile.suspended_until <= now()
      )
    )
  limit 1;

  if not found then return null; end if;

  select exists (
    select 1 from public.referral_attributions
    where visitor_token_hash = p_visitor_token_hash
  ) into v_repeat;

  insert into public.referral_clicks (
    referral_profile_id,
    sub_admin_id,
    referral_code_snapshot,
    visitor_token_hash,
    landing_page,
    event_type
  ) values (
    v_candidate.id,
    v_candidate.user_id,
    v_candidate.referral_code,
    p_visitor_token_hash,
    left(p_landing_page, 500),
    case when v_repeat then 'repeat_click' else 'click' end
  );

  if p_user_id = v_candidate.user_id then return null; end if;

  if p_user_id is not null then
    select * into v_existing
    from public.referral_attributions
    where user_id = p_user_id
    limit 1;
    if found then
      return jsonb_build_object(
        'id', v_existing.id,
        'referralProfileId', v_existing.referral_profile_id,
        'subAdminId', v_existing.sub_admin_id,
        'referralCode', v_existing.referral_code_snapshot,
        'commissionRateBasisPoints', v_existing.commission_rate_basis_points,
        'expiresAt', v_existing.expires_at
      );
    end if;
  end if;

  select * into v_existing
  from public.referral_attributions
  where visitor_token_hash = p_visitor_token_hash
    and (user_id is not null or expires_at > now())
  limit 1;
  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'referralProfileId', v_existing.referral_profile_id,
      'subAdminId', v_existing.sub_admin_id,
      'referralCode', v_existing.referral_code_snapshot,
      'commissionRateBasisPoints', v_existing.commission_rate_basis_points,
      'expiresAt', v_existing.expires_at
    );
  end if;

  begin
    insert into public.referral_attributions (
      referral_profile_id,
      sub_admin_id,
      referral_code_snapshot,
      visitor_token_hash,
      user_id,
      commission_rate_basis_points,
      attributed_at,
      expires_at,
      source,
      landing_page
    ) values (
      v_candidate.id,
      v_candidate.user_id,
      v_candidate.referral_code,
      p_visitor_token_hash,
      p_user_id,
      v_candidate.commission_rate_basis_points,
      now(),
      p_expires_at,
      'referral_link',
      left(p_landing_page, 500)
    ) returning id into v_id;
  exception when unique_violation then
    if p_user_id is not null then
      select * into v_existing
      from public.referral_attributions
      where user_id = p_user_id
      limit 1;
    else
      select * into v_existing
      from public.referral_attributions
      where visitor_token_hash = p_visitor_token_hash
      limit 1;
    end if;
    if found then
      return jsonb_build_object(
        'id', v_existing.id,
        'referralProfileId', v_existing.referral_profile_id,
        'subAdminId', v_existing.sub_admin_id,
        'referralCode', v_existing.referral_code_snapshot,
        'commissionRateBasisPoints', v_existing.commission_rate_basis_points,
        'expiresAt', v_existing.expires_at
      );
    end if;
    raise;
  end;

  return jsonb_build_object(
    'id', v_id,
    'referralProfileId', v_candidate.id,
    'subAdminId', v_candidate.user_id,
    'referralCode', v_candidate.referral_code,
    'commissionRateBasisPoints', v_candidate.commission_rate_basis_points,
    'expiresAt', p_expires_at
  );
end;
$$;

revoke all on function public.capture_referral_attribution(
  text, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.capture_referral_attribution(
  text, text, text, uuid, timestamptz
) to service_role;

create or replace function public.claim_referral_attribution(
  p_attribution_id uuid,
  p_visitor_token_hash text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attribution public.referral_attributions%rowtype;
  v_existing public.referral_attributions%rowtype;
begin
  select * into v_existing
  from public.referral_attributions
  where user_id = p_user_id
  limit 1;
  if found then return to_jsonb(v_existing); end if;

  select attribution.* into v_attribution
  from public.referral_attributions attribution
  join public.sub_admin_referral_profiles referral
    on referral.id = attribution.referral_profile_id
  join public.profiles profile on profile.id = referral.user_id
  where attribution.id = p_attribution_id
    and attribution.visitor_token_hash = p_visitor_token_hash
    and attribution.expires_at > now()
    and attribution.user_id is null
    and attribution.sub_admin_id <> p_user_id
    and referral.referral_enabled = true
    and profile.role = 'sub_admin'
    and profile.deleted_at is null
    and (
      profile.account_status = 'active'
      or (
        profile.account_status = 'suspended'
        and profile.suspended_until is not null
        and profile.suspended_until <= now()
      )
    )
  for update of attribution;

  if not found then return null; end if;

  begin
    update public.referral_attributions
    set user_id = p_user_id, updated_at = now()
    where id = v_attribution.id;
  exception when unique_violation then
    select * into v_existing
    from public.referral_attributions
    where user_id = p_user_id
    limit 1;
    return to_jsonb(v_existing);
  end;

  select * into v_attribution
  from public.referral_attributions
  where id = v_attribution.id;
  return to_jsonb(v_attribution);
end;
$$;

revoke all on function public.claim_referral_attribution(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_referral_attribution(uuid, text, uuid)
  to service_role;

create or replace function public.record_referral_commission_for_payment(
  p_payment_type text,
  p_reference text,
  p_provider_event_id text,
  p_provider_transaction_id text default null,
  p_hold_days integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_source_id uuid;
  v_customer_id uuid;
  v_referral_profile_id uuid;
  v_sub_admin_id uuid;
  v_attribution_id uuid;
  v_code text;
  v_product_code text;
  v_status text;
  v_currency text;
  v_paid_at timestamptz;
  v_gross bigint;
  v_discount bigint;
  v_fee bigint;
  v_cost bigint;
  v_profit bigint;
  v_sub_rate integer;
  v_super_rate integer;
  v_sub_amount bigint;
  v_super_amount bigint;
  v_available_at timestamptz;
  v_idempotency_key text;
begin
  if p_payment_type not in ('signup', 'subscription')
    or char_length(trim(coalesce(p_reference, ''))) < 2
    or char_length(trim(coalesce(p_provider_event_id, ''))) < 2
    or p_hold_days not between 0 and 365 then
    raise exception 'invalid referral commission payment input';
  end if;

  select id into v_existing_id
  from public.referral_commission_ledger
  where source_payment_type = p_payment_type
    and payment_reference = p_reference
    and entry_type = 'earning';
  if found then return v_existing_id; end if;

  if p_payment_type = 'signup' then
    select payment.id, payment.user_id, payment.referral_profile_id,
      payment.referring_sub_admin_id, payment.referral_attribution_id,
      payment.referral_code_snapshot, null::text, payment.status,
      payment.currency, payment.paid_at, payment.amount_minor::bigint,
      payment.discount_amount_minor, payment.processing_fee_minor,
      payment.direct_cost_minor, payment.sub_admin_rate_basis_points,
      payment.super_admin_rate_basis_points
    into v_source_id, v_customer_id, v_referral_profile_id,
      v_sub_admin_id, v_attribution_id, v_code, v_product_code, v_status,
      v_currency, v_paid_at, v_gross, v_discount, v_fee, v_cost,
      v_sub_rate, v_super_rate
    from public.signup_payments payment
    where payment.provider_reference = p_reference
    for update;
    if not found or v_status <> 'succeeded' then
      raise exception 'settled signup payment not found';
    end if;
  else
    select payment.id, payment.user_id, payment.referral_profile_id,
      payment.referring_sub_admin_id, payment.referral_attribution_id,
      payment.referral_code_snapshot, payment.plan_code, payment.status,
      payment.currency, payment.paid_at, payment.amount_minor::bigint,
      payment.discount_amount_minor, payment.processing_fee_minor,
      payment.direct_cost_minor, payment.sub_admin_rate_basis_points,
      payment.super_admin_rate_basis_points
    into v_source_id, v_customer_id, v_referral_profile_id,
      v_sub_admin_id, v_attribution_id, v_code, v_product_code, v_status,
      v_currency, v_paid_at, v_gross, v_discount, v_fee, v_cost,
      v_sub_rate, v_super_rate
    from public.ai_subscriptions payment
    where payment.provider_reference = p_reference
    for update;
    if not found or v_status <> 'active' then
      raise exception 'settled subscription payment not found';
    end if;
  end if;

  -- Direct payments intentionally produce no referral ledger entry.
  if v_referral_profile_id is null or v_sub_admin_id is null then return null; end if;
  if v_customer_id = v_sub_admin_id then return null; end if;

  if not exists (
    select 1
    from public.sub_admin_referral_profiles referral
    join public.profiles profile on profile.id = referral.user_id
    where referral.id = v_referral_profile_id
      and referral.user_id = v_sub_admin_id
      and referral.referral_enabled = true
      and profile.role = 'sub_admin'
      and profile.deleted_at is null
      and (
        profile.account_status = 'active'
        or (
          profile.account_status = 'suspended'
          and profile.suspended_until is not null
          and profile.suspended_until <= now()
        )
      )
  ) then
    return null;
  end if;

  if v_sub_rate is null or v_super_rate is null
    or v_sub_rate + v_super_rate <> 10000 then
    raise exception 'invalid commission-rate snapshot';
  end if;

  v_profit := v_gross - v_discount - v_fee - v_cost;
  if v_profit <= 0 then return null; end if;
  v_sub_amount := floor((v_profit::numeric * v_sub_rate) / 10000)::bigint;
  v_super_amount := v_profit - v_sub_amount;
  v_available_at := v_paid_at + make_interval(days => p_hold_days);
  v_idempotency_key := 'paystack:charge.success:' || p_payment_type || ':' || p_reference;

  insert into public.referral_commission_ledger (
    referral_profile_id, sub_admin_id, customer_id,
    referral_attribution_id, source_payment_type, source_payment_id,
    payment_reference, provider_transaction_id, provider_event_id,
    entry_type, status, product_code, currency, gross_amount_minor,
    discount_amount_minor, refund_amount_minor, processing_fee_minor,
    direct_cost_minor, net_profit_minor, sub_admin_rate_basis_points,
    sub_admin_amount_minor, super_admin_rate_basis_points,
    super_admin_amount_minor, available_at, idempotency_key, metadata
  ) values (
    v_referral_profile_id, v_sub_admin_id, v_customer_id,
    v_attribution_id, p_payment_type, v_source_id,
    p_reference, nullif(trim(p_provider_transaction_id), ''), p_provider_event_id,
    'earning', case when v_available_at <= now() then 'available' else 'pending' end,
    v_product_code, v_currency, v_gross, v_discount, 0, v_fee, v_cost,
    v_profit, v_sub_rate, v_sub_amount, v_super_rate, v_super_amount,
    v_available_at, v_idempotency_key,
    jsonb_build_object(
      'referral_code_snapshot', v_code,
      'profit_definition', 'gross_less_tracked_discounts_fees_and_direct_costs',
      'provider_funds_split', false
    )
  ) on conflict do nothing
  returning id into v_existing_id;

  if v_existing_id is null then
    select id into v_existing_id
    from public.referral_commission_ledger
    where source_payment_type = p_payment_type
      and payment_reference = p_reference
      and entry_type = 'earning';
  end if;

  if p_payment_type = 'signup' then
    update public.signup_payments
    set provider_transaction_id = coalesce(nullif(trim(p_provider_transaction_id), ''), provider_transaction_id),
        net_profit_minor = v_profit,
        updated_at = now()
    where id = v_source_id;
  else
    update public.ai_subscriptions
    set provider_transaction_id = coalesce(nullif(trim(p_provider_transaction_id), ''), provider_transaction_id),
        net_profit_minor = v_profit,
        updated_at = now()
    where id = v_source_id;
  end if;

  return v_existing_id;
end;
$$;

revoke all on function public.record_referral_commission_for_payment(
  text, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.record_referral_commission_for_payment(
  text, text, text, text, integer
) to service_role;

create or replace function public.record_referral_commission_reversal(
  p_payment_reference text,
  p_refund_amount_minor bigint,
  p_currency text,
  p_provider_event_id text,
  p_entry_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_earning public.referral_commission_ledger%rowtype;
  v_existing_id uuid;
  v_already_refunded bigint;
  v_remaining_gross bigint;
  v_actual_refund bigint;
  v_remaining_profit bigint;
  v_remaining_sub bigint;
  v_profit_reduction bigint;
  v_sub_reduction bigint;
  v_super_reduction bigint;
  v_total_refunded bigint;
begin
  if p_refund_amount_minor <= 0
    or p_currency !~ '^[A-Z]{3}$'
    or p_entry_type not in ('refund_reversal', 'chargeback_reversal')
    or char_length(trim(coalesce(p_provider_event_id, ''))) < 2 then
    raise exception 'invalid commission reversal input';
  end if;

  select id into v_existing_id
  from public.referral_commission_ledger
  where provider_event_id = p_provider_event_id;
  if found then return v_existing_id; end if;

  select * into v_earning
  from public.referral_commission_ledger
  where payment_reference = p_payment_reference
    and entry_type = 'earning'
  for update;
  if not found then return null; end if;
  if v_earning.currency <> p_currency then
    raise exception 'reversal currency does not match original payment';
  end if;

  select coalesce(sum(refund_amount_minor), 0),
    greatest(0, v_earning.net_profit_minor + coalesce(sum(net_profit_minor), 0)),
    greatest(0, v_earning.sub_admin_amount_minor + coalesce(sum(sub_admin_amount_minor), 0))
  into v_already_refunded, v_remaining_profit, v_remaining_sub
  from public.referral_commission_ledger
  where parent_earning_id = v_earning.id
    and entry_type in ('refund_reversal', 'chargeback_reversal');

  v_remaining_gross := greatest(0, v_earning.gross_amount_minor - v_already_refunded);
  if v_remaining_gross <= 0 then return null; end if;
  v_actual_refund := least(p_refund_amount_minor, v_remaining_gross);

  if v_actual_refund = v_remaining_gross then
    v_profit_reduction := v_remaining_profit;
    v_sub_reduction := v_remaining_sub;
  else
    v_profit_reduction := least(
      v_remaining_profit,
      floor((v_remaining_profit::numeric * v_actual_refund) / v_remaining_gross)::bigint
    );
    v_sub_reduction := least(
      v_remaining_sub,
      floor((v_profit_reduction::numeric * v_earning.sub_admin_rate_basis_points) / 10000)::bigint
    );
  end if;
  v_super_reduction := v_profit_reduction - v_sub_reduction;

  insert into public.referral_commission_ledger (
    referral_profile_id, sub_admin_id, customer_id, referral_attribution_id,
    source_payment_type, source_payment_id, payment_reference,
    provider_transaction_id, provider_event_id, parent_earning_id,
    entry_type, status, product_code, currency, gross_amount_minor,
    discount_amount_minor, refund_amount_minor, processing_fee_minor,
    direct_cost_minor, net_profit_minor, sub_admin_rate_basis_points,
    sub_admin_amount_minor, super_admin_rate_basis_points,
    super_admin_amount_minor, available_at, idempotency_key, metadata
  ) values (
    v_earning.referral_profile_id, v_earning.sub_admin_id,
    v_earning.customer_id, v_earning.referral_attribution_id,
    v_earning.source_payment_type, v_earning.source_payment_id,
    v_earning.payment_reference, v_earning.provider_transaction_id,
    p_provider_event_id, v_earning.id, p_entry_type, 'reversed',
    v_earning.product_code, v_earning.currency, v_earning.gross_amount_minor,
    0, v_actual_refund, 0, 0, -v_profit_reduction,
    v_earning.sub_admin_rate_basis_points, -v_sub_reduction,
    v_earning.super_admin_rate_basis_points, -v_super_reduction,
    now(), 'paystack:' || p_entry_type || ':' || p_provider_event_id,
    jsonb_build_object('original_earning_id', v_earning.id)
  ) on conflict do nothing
  returning id into v_existing_id;

  if v_existing_id is null then
    select id into v_existing_id
    from public.referral_commission_ledger
    where provider_event_id = p_provider_event_id;
    return v_existing_id;
  end if;

  v_total_refunded := v_already_refunded + v_actual_refund;
  if v_earning.source_payment_type = 'signup' then
    update public.signup_payments
    set refund_amount_minor = v_total_refunded,
        status = case when v_total_refunded >= amount_minor then 'refunded' else status end,
        updated_at = now()
    where id = v_earning.source_payment_id;

    if v_total_refunded >= v_earning.gross_amount_minor then
      update public.profiles
      set access_status = 'refunded', updated_at = now()
      where id = v_earning.customer_id;
    end if;
  elsif v_earning.source_payment_type = 'subscription' then
    update public.ai_subscriptions
    set refund_amount_minor = v_total_refunded,
        status = case when v_total_refunded >= amount_minor then 'refunded' else status end,
        updated_at = now()
    where id = v_earning.source_payment_id;
  end if;

  return v_existing_id;
end;
$$;

revoke all on function public.record_referral_commission_reversal(
  text, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_referral_commission_reversal(
  text, bigint, text, text, text
) to service_role;

create or replace function public.refresh_referral_commission_availability()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.referral_commission_ledger
  set status = 'available', updated_at = now()
  where entry_type = 'earning'
    and status = 'pending'
    and available_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.refresh_referral_commission_availability()
  from public, anon, authenticated;
grant execute on function public.refresh_referral_commission_availability()
  to service_role;

create or replace function public.admin_manage_referral_profile(
  p_referral_profile_id uuid,
  p_operation text,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.sub_admin_referral_profiles%rowtype;
  v_after public.sub_admin_referral_profiles%rowtype;
  v_profile public.profiles%rowtype;
  v_code text;
  v_attempt integer;
  v_regenerated boolean := false;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'an administrative reason is required';
  end if;

  select * into v_before
  from public.sub_admin_referral_profiles
  where id = p_referral_profile_id
  for update;
  if not found then raise exception 'referral profile not found'; end if;
  select * into v_profile from public.profiles where id = v_before.user_id;

  case p_operation
    when 'disable' then
      update public.sub_admin_referral_profiles
      set referral_enabled = false, updated_at = now()
      where id = p_referral_profile_id;
    when 'enable' then
      if v_profile.role <> 'sub_admin'
        or v_profile.deleted_at is not null
        or not (
          v_profile.account_status = 'active'
          or (
            v_profile.account_status = 'suspended'
            and v_profile.suspended_until is not null
            and v_profile.suspended_until <= now()
          )
        ) then
        raise exception 'only an active sub-admin can accept referrals';
      end if;
      update public.sub_admin_referral_profiles
      set referral_enabled = true, updated_at = now()
      where id = p_referral_profile_id;
    when 'regenerate_code' then
      for v_attempt in 1..12 loop
        v_code := public.generate_referral_code();
        begin
          update public.sub_admin_referral_profiles
          set referral_code = v_code, updated_at = now()
          where id = p_referral_profile_id;
          v_regenerated := true;
          exit;
        exception when unique_violation then
        end;
      end loop;
      if not v_regenerated then raise exception 'unable to regenerate referral code'; end if;
    else
      raise exception 'unsupported referral-profile operation';
  end case;

  select * into v_after
  from public.sub_admin_referral_profiles
  where id = p_referral_profile_id;
  perform public.insert_admin_audit(
    'referral_profile.' || p_operation,
    'referral_profile',
    p_referral_profile_id::text,
    to_jsonb(v_before),
    to_jsonb(v_after),
    p_reason,
    p_request_metadata
  );
  return to_jsonb(v_after);
end;
$$;

revoke all on function public.admin_manage_referral_profile(
  uuid, text, text, jsonb
) from public, anon;
grant execute on function public.admin_manage_referral_profile(
  uuid, text, text, jsonb
) to authenticated;

create or replace function public.admin_adjust_referral_commission(
  p_referral_profile_id uuid,
  p_currency text,
  p_sub_admin_amount_minor bigint,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.sub_admin_referral_profiles%rowtype;
  v_id uuid := gen_random_uuid();
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if p_currency !~ '^[A-Z]{3}$' or p_sub_admin_amount_minor = 0 then
    raise exception 'a non-zero adjustment and valid currency are required';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'an administrative reason is required';
  end if;
  select * into v_referral
  from public.sub_admin_referral_profiles
  where id = p_referral_profile_id
  for update;
  if not found then raise exception 'referral profile not found'; end if;

  insert into public.referral_commission_ledger (
    id, referral_profile_id, sub_admin_id, source_payment_type,
    entry_type, status, currency, gross_amount_minor, net_profit_minor,
    sub_admin_rate_basis_points, sub_admin_amount_minor,
    super_admin_rate_basis_points, super_admin_amount_minor,
    available_at, idempotency_key, metadata
  ) values (
    v_id, v_referral.id, v_referral.user_id, 'manual',
    'adjustment', 'adjusted', p_currency, 0, 0,
    v_referral.commission_rate_basis_points, p_sub_admin_amount_minor,
    10000 - v_referral.commission_rate_basis_points, -p_sub_admin_amount_minor,
    now(), 'manual-adjustment:' || v_id::text,
    jsonb_build_object('reason', trim(p_reason))
  );

  perform public.insert_admin_audit(
    'referral_commission.adjustment', 'referral_ledger', v_id::text,
    null,
    jsonb_build_object(
      'referral_profile_id', p_referral_profile_id,
      'currency', p_currency,
      'sub_admin_amount_minor', p_sub_admin_amount_minor
    ),
    p_reason,
    p_request_metadata
  );
  return v_id;
end;
$$;

revoke all on function public.admin_adjust_referral_commission(
  uuid, text, bigint, text, jsonb
) from public, anon;
grant execute on function public.admin_adjust_referral_commission(
  uuid, text, bigint, text, jsonb
) to authenticated;

create or replace function public.admin_record_referral_payout(
  p_referral_profile_id uuid,
  p_currency text,
  p_amount_minor bigint,
  p_payment_method text,
  p_external_reference text,
  p_notes text,
  p_payout_date timestamptz,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.sub_admin_referral_profiles%rowtype;
  v_ledger_balance bigint;
  v_paid_allocations bigint;
  v_available_balance bigint;
  v_payout_id uuid;
  v_remaining bigint;
  v_allocate bigint;
  v_entry record;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if p_currency !~ '^[A-Z]{3}$' or p_amount_minor <= 0 then
    raise exception 'a positive payout and valid currency are required';
  end if;
  if char_length(trim(coalesce(p_payment_method, ''))) < 2
    or char_length(trim(coalesce(p_external_reference, ''))) < 2
    or char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'payment method, reference, and reason are required';
  end if;
  if p_payout_date > now() + interval '5 minutes' then
    raise exception 'payout date cannot be in the future';
  end if;

  select * into v_referral
  from public.sub_admin_referral_profiles
  where id = p_referral_profile_id
  for update;
  if not found then raise exception 'referral profile not found'; end if;

  update public.referral_commission_ledger
  set status = 'available', updated_at = now()
  where referral_profile_id = p_referral_profile_id
    and currency = p_currency
    and entry_type = 'earning'
    and status = 'pending'
    and available_at <= now();

  select coalesce(sum(sub_admin_amount_minor), 0)
  into v_ledger_balance
  from public.referral_commission_ledger
  where referral_profile_id = p_referral_profile_id
    and currency = p_currency
    and not (
      (
        entry_type = 'earning'
        and status = 'pending'
        and available_at > now()
      )
      or (
        entry_type in ('refund_reversal', 'chargeback_reversal')
        and exists (
          select 1
          from public.referral_commission_ledger parent
          where parent.id = referral_commission_ledger.parent_earning_id
            and parent.entry_type = 'earning'
            and parent.status = 'pending'
            and parent.available_at > now()
        )
      )
    );

  select coalesce(sum(allocation.amount_minor), 0)
  into v_paid_allocations
  from public.referral_payout_allocations allocation
  join public.referral_payouts payout on payout.id = allocation.payout_id
  where payout.referral_profile_id = p_referral_profile_id
    and payout.currency = p_currency
    and payout.status = 'paid';

  v_available_balance := v_ledger_balance - v_paid_allocations;
  if v_available_balance <= 0 then
    raise exception 'no positive available balance can be paid';
  end if;
  if p_amount_minor > v_available_balance then
    raise exception 'payout exceeds the available balance';
  end if;

  insert into public.referral_payouts (
    referral_profile_id, sub_admin_id, currency, amount_minor, status,
    payment_method, external_reference, notes, payout_date,
    created_by_super_admin_id, paid_at
  ) values (
    v_referral.id, v_referral.user_id, p_currency, p_amount_minor, 'paid',
    trim(p_payment_method), trim(p_external_reference), nullif(trim(p_notes), ''),
    p_payout_date, auth.uid(), p_payout_date
  ) returning id into v_payout_id;

  v_remaining := p_amount_minor;
  for v_entry in
    select ledger.id,
      ledger.sub_admin_amount_minor - coalesce((
        select sum(allocation.amount_minor)
        from public.referral_payout_allocations allocation
        join public.referral_payouts payout on payout.id = allocation.payout_id
        where allocation.ledger_entry_id = ledger.id
          and payout.status = 'paid'
      ), 0) as unallocated_minor
    from public.referral_commission_ledger ledger
    where ledger.referral_profile_id = p_referral_profile_id
      and ledger.currency = p_currency
      and ledger.sub_admin_amount_minor > 0
      and not (
        ledger.entry_type = 'earning'
        and ledger.status = 'pending'
        and ledger.available_at > now()
      )
    order by ledger.available_at, ledger.created_at, ledger.id
    for update of ledger
  loop
    exit when v_remaining <= 0;
    if v_entry.unallocated_minor <= 0 then continue; end if;
    v_allocate := least(v_remaining, v_entry.unallocated_minor);
    insert into public.referral_payout_allocations (
      payout_id, ledger_entry_id, amount_minor
    ) values (v_payout_id, v_entry.id, v_allocate);
    v_remaining := v_remaining - v_allocate;

    if v_allocate = v_entry.unallocated_minor then
      update public.referral_commission_ledger
      set status = case when entry_type = 'earning' then 'paid' else status end,
          updated_at = now()
      where id = v_entry.id;
    end if;
  end loop;

  if v_remaining <> 0 then
    raise exception 'available ledger entries could not satisfy payout allocation';
  end if;

  perform public.insert_admin_audit(
    'referral_payout.recorded', 'referral_payout', v_payout_id::text,
    null,
    jsonb_build_object(
      'referral_profile_id', p_referral_profile_id,
      'currency', p_currency,
      'amount_minor', p_amount_minor,
      'external_reference', p_external_reference
    ),
    p_reason,
    p_request_metadata
  );
  return v_payout_id;
end;
$$;

revoke all on function public.admin_record_referral_payout(
  uuid, text, bigint, text, text, text, timestamptz, text, jsonb
) from public, anon;
grant execute on function public.admin_record_referral_payout(
  uuid, text, bigint, text, text, text, timestamptz, text, jsonb
) to authenticated;

create or replace function public.admin_cancel_referral_payout(
  p_payout_id uuid,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_profile_id uuid;
  v_before public.referral_payouts%rowtype;
  v_after public.referral_payouts%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'an administrative reason is required';
  end if;

  select referral_profile_id into v_referral_profile_id
  from public.referral_payouts
  where id = p_payout_id;
  if not found then raise exception 'referral payout not found'; end if;

  -- Serialize all balance-changing work for this referral profile.
  perform 1
  from public.sub_admin_referral_profiles
  where id = v_referral_profile_id
  for update;

  select * into v_before
  from public.referral_payouts
  where id = p_payout_id
  for update;

  if v_before.status = 'cancelled' then return to_jsonb(v_before); end if;
  if v_before.status <> 'paid' then
    raise exception 'only a paid payout can be cancelled';
  end if;

  update public.referral_payouts
  set status = 'cancelled', updated_at = now()
  where id = p_payout_id;

  update public.referral_commission_ledger ledger
  set status = 'available', updated_at = now()
  where ledger.entry_type = 'earning'
    and ledger.status = 'paid'
    and exists (
      select 1
      from public.referral_payout_allocations allocation
      where allocation.payout_id = p_payout_id
        and allocation.ledger_entry_id = ledger.id
    )
    and coalesce((
      select sum(allocation.amount_minor)
      from public.referral_payout_allocations allocation
      join public.referral_payouts payout on payout.id = allocation.payout_id
      where allocation.ledger_entry_id = ledger.id
        and payout.status = 'paid'
    ), 0) < ledger.sub_admin_amount_minor;

  select * into v_after
  from public.referral_payouts
  where id = p_payout_id;

  perform public.insert_admin_audit(
    'referral_payout.cancelled', 'referral_payout', p_payout_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason, p_request_metadata
  );
  return to_jsonb(v_after);
end;
$$;

revoke all on function public.admin_cancel_referral_payout(
  uuid, text, jsonb
) from public, anon;
grant execute on function public.admin_cancel_referral_payout(
  uuid, text, jsonb
) to authenticated;

create or replace function public.admin_manage_user(
  p_target_id uuid,
  p_operation text,
  p_value text,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'an administrative reason is required';
  end if;

  select role into v_actor_role from public.profiles where id = v_actor_id;
  select * into v_before from public.profiles where id = p_target_id for update;
  if not found then raise exception 'user profile not found'; end if;

  if v_before.role in ('sub_admin', 'admin', 'super_admin')
    and v_actor_role <> 'super_admin' then
    raise exception 'only a super administrator can manage staff accounts' using errcode = '42501';
  end if;

  case p_operation
    when 'suspend' then
      update public.profiles
      set account_status = 'suspended', suspended_until = null,
          suspension_reason = trim(p_reason), updated_at = now()
      where id = p_target_id;
    when 'suspend_until' then
      begin
        v_until := p_value::timestamptz;
      exception when others then
        raise exception 'a valid suspension end time is required';
      end;
      if v_until <= now() then raise exception 'suspension end must be in the future'; end if;
      update public.profiles
      set account_status = 'suspended', suspended_until = v_until,
          suspension_reason = trim(p_reason), updated_at = now()
      where id = p_target_id;
    when 'reactivate' then
      update public.profiles
      set account_status = 'active', suspended_until = null,
          suspension_reason = null, updated_at = now()
      where id = p_target_id;
    when 'change_role' then
      if v_actor_role <> 'super_admin' then
        raise exception 'super administrator authorization required' using errcode = '42501';
      end if;
      if v_actor_id = p_target_id then
        raise exception 'administrators cannot change their own role';
      end if;
      if p_value not in ('user', 'sub_admin', 'admin', 'super_admin') then
        raise exception 'invalid role';
      end if;
      update public.profiles
      set role = p_value, role_updated_at = now(), role_updated_by = v_actor_id,
          updated_at = now()
      where id = p_target_id;
    when 'request_anonymization' then
      if exists (
        select 1 from public.sub_admin_referral_profiles referral
        join public.referral_commission_ledger ledger
          on ledger.referral_profile_id = referral.id
        where referral.user_id = p_target_id
      ) then
        raise exception 'sub-admin financial history must be retained and the account deactivated instead';
      end if;
      insert into public.privacy_requests (
        user_id, request_type, reason, requested_by
      ) values (p_target_id, 'anonymization', trim(p_reason), v_actor_id);
      update public.profiles set account_status = 'deletion_pending', updated_at = now()
      where id = p_target_id;
    when 'request_deletion' then
      if exists (
        select 1 from public.sub_admin_referral_profiles referral
        join public.referral_commission_ledger ledger
          on ledger.referral_profile_id = referral.id
        where referral.user_id = p_target_id
      ) then
        raise exception 'sub-admin financial history must be retained and the account deactivated instead';
      end if;
      insert into public.privacy_requests (
        user_id, request_type, reason, requested_by
      ) values (p_target_id, 'deletion', trim(p_reason), v_actor_id);
      update public.profiles set account_status = 'deletion_pending', updated_at = now()
      where id = p_target_id;
    when 'reset_rate_limit' then
      insert into public.rate_limit_resets (user_id, scope, reason, reset_by)
      values (p_target_id, coalesce(nullif(trim(p_value), ''), 'all'), trim(p_reason), v_actor_id);
    else
      raise exception 'unsupported user operation';
  end case;

  select * into v_after from public.profiles where id = p_target_id;
  perform public.insert_admin_audit(
    'user.' || p_operation, 'user', p_target_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason, p_request_metadata
  );
  return public.redact_admin_json(to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_manage_user(
  uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.admin_manage_user(
  uuid, text, text, text, jsonb
) to authenticated;

create or replace view public.referral_sub_admin_rollup
with (security_invoker = true)
as
select
  referral.id,
  referral.user_id,
  profile.display_name,
  profile.email,
  profile.account_status,
  profile.suspended_until,
  (
    profile.role = 'sub_admin'
    and profile.deleted_at is null
    and (
      profile.account_status = 'active'
      or (
        profile.account_status = 'suspended'
        and profile.suspended_until is not null
        and profile.suspended_until <= now()
      )
    )
  ) as referral_operational,
  referral.referral_code,
  referral.referral_enabled,
  referral.commission_rate_basis_points,
  referral.created_at,
  coalesce(clicks.total_clicks, 0) as total_clicks,
  coalesce(clicks.unique_visitors, 0) as unique_visitors,
  coalesce(attributions.referred_registrations, 0) as referred_registrations,
  coalesce(earnings.paying_customers, 0) as paying_customers,
  coalesce(earnings.successful_transactions, 0) as successful_transactions,
  greatest(clicks.last_click_at, earnings.last_transaction_at) as last_referral_activity_at,
  coalesce(financials.by_currency, '{}'::jsonb) as financials
from public.sub_admin_referral_profiles referral
join public.profiles profile on profile.id = referral.user_id
left join lateral (
  select count(*)::bigint as total_clicks,
    count(distinct visitor_token_hash)::bigint as unique_visitors,
    max(created_at) as last_click_at
  from public.referral_clicks click
  where click.referral_profile_id = referral.id
) clicks on true
left join lateral (
  select count(*) filter (where attribution.user_id is not null)::bigint
    as referred_registrations
  from public.referral_attributions attribution
  where attribution.referral_profile_id = referral.id
) attributions on true
left join lateral (
  select count(distinct ledger.customer_id)::bigint as paying_customers,
    count(*)::bigint as successful_transactions,
    max(ledger.created_at) as last_transaction_at
  from public.referral_commission_ledger ledger
  where ledger.referral_profile_id = referral.id
    and ledger.entry_type = 'earning'
) earnings on true
left join lateral (
  select jsonb_object_agg(currency_rows.currency, to_jsonb(currency_rows) - 'currency')
    as by_currency
  from (
    select currency_source.currency,
      coalesce((
        select sum(ledger.gross_amount_minor)
        from public.referral_commission_ledger ledger
        where ledger.referral_profile_id = referral.id
          and ledger.currency = currency_source.currency
          and ledger.entry_type = 'earning'
      ), 0)::bigint as referred_revenue_minor,
      coalesce((
        select sum(ledger.net_profit_minor)
        from public.referral_commission_ledger ledger
        where ledger.referral_profile_id = referral.id
          and ledger.currency = currency_source.currency
      ), 0)::bigint as referred_profit_minor,
      coalesce((
        select sum(ledger.sub_admin_amount_minor)
        from public.referral_commission_ledger ledger
        where ledger.referral_profile_id = referral.id
          and ledger.currency = currency_source.currency
      ), 0)::bigint as commission_earned_minor,
      coalesce((
        select sum(ledger.super_admin_amount_minor)
        from public.referral_commission_ledger ledger
        where ledger.referral_profile_id = referral.id
          and ledger.currency = currency_source.currency
      ), 0)::bigint as super_admin_share_minor,
      coalesce((
        select sum(ledger.sub_admin_amount_minor)
        from public.referral_commission_ledger ledger
        where ledger.referral_profile_id = referral.id
          and ledger.currency = currency_source.currency
          and (
            (
              ledger.entry_type = 'earning'
              and ledger.status = 'pending'
              and ledger.available_at > now()
            )
            or (
              ledger.entry_type in ('refund_reversal', 'chargeback_reversal')
              and exists (
                select 1
                from public.referral_commission_ledger parent
                where parent.id = ledger.parent_earning_id
                  and parent.entry_type = 'earning'
                  and parent.status = 'pending'
                  and parent.available_at > now()
              )
            )
          )
      ), 0)::bigint as pending_commission_minor,
      (
        coalesce((
          select sum(ledger.sub_admin_amount_minor)
          from public.referral_commission_ledger ledger
          where ledger.referral_profile_id = referral.id
            and ledger.currency = currency_source.currency
            and not (
              (
                ledger.entry_type = 'earning'
                and ledger.status = 'pending'
                and ledger.available_at > now()
              )
              or (
                ledger.entry_type in ('refund_reversal', 'chargeback_reversal')
                and exists (
                  select 1
                  from public.referral_commission_ledger parent
                  where parent.id = ledger.parent_earning_id
                    and parent.entry_type = 'earning'
                    and parent.status = 'pending'
                    and parent.available_at > now()
                )
              )
            )
        ), 0)
        - coalesce((
          select sum(allocation.amount_minor)
          from public.referral_payout_allocations allocation
          join public.referral_payouts payout on payout.id = allocation.payout_id
          where payout.referral_profile_id = referral.id
            and payout.currency = currency_source.currency
            and payout.status = 'paid'
        ), 0)
      )::bigint as available_balance_minor,
      coalesce((
        select sum(payout.amount_minor)
        from public.referral_payouts payout
        where payout.referral_profile_id = referral.id
          and payout.currency = currency_source.currency
          and payout.status = 'paid'
      ), 0)::bigint as total_paid_minor
    from (
      select ledger.currency
      from public.referral_commission_ledger ledger
      where ledger.referral_profile_id = referral.id
      union
      select payout.currency
      from public.referral_payouts payout
      where payout.referral_profile_id = referral.id
    ) currency_source
  ) currency_rows
) financials on true;

revoke all on public.referral_sub_admin_rollup from public, anon, authenticated;
grant select on public.referral_sub_admin_rollup to service_role;

create or replace function public.referral_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalSubAdmins', (select count(*) from public.sub_admin_referral_profiles),
    'activeSubAdmins', (
      select count(*)
      from public.sub_admin_referral_profiles referral
      join public.profiles profile on profile.id = referral.user_id
      where referral.referral_enabled = true
        and profile.role = 'sub_admin'
        and profile.deleted_at is null
        and (
          profile.account_status = 'active'
          or (
            profile.account_status = 'suspended'
            and profile.suspended_until is not null
            and profile.suspended_until <= now()
          )
        )
    ),
    'suspendedSubAdmins', (
      select count(*)
      from public.sub_admin_referral_profiles referral
      join public.profiles profile on profile.id = referral.user_id
      where not (
        referral.referral_enabled = true
        and profile.role = 'sub_admin'
        and profile.deleted_at is null
        and (
          profile.account_status = 'active'
          or (
            profile.account_status = 'suspended'
            and profile.suspended_until is not null
            and profile.suspended_until <= now()
          )
        )
      )
    ),
    'totalClicks', (select count(*) from public.referral_clicks),
    'uniqueVisitors', (select count(distinct visitor_token_hash) from public.referral_clicks),
    'referredRegistrations', (
      select count(*) from public.referral_attributions where user_id is not null
    ),
    'payingCustomers', (
      select count(distinct customer_id)
      from public.referral_commission_ledger where entry_type = 'earning'
    ),
    'referredPayments', (
      select count(*) from public.referral_commission_ledger where entry_type = 'earning'
    ),
    'financials', coalesce((
      select jsonb_object_agg(currency, totals)
      from (
        select currency, jsonb_build_object(
          'referredRevenueMinor', sum(gross_amount_minor) filter (where entry_type = 'earning'),
          'referredProfitMinor', sum(net_profit_minor),
          'subAdminCommissionMinor', sum(sub_admin_amount_minor),
          'superAdminShareMinor', sum(super_admin_amount_minor),
          'pendingCommissionMinor', coalesce(sum(sub_admin_amount_minor) filter (
            where (
              entry_type = 'earning'
              and status = 'pending'
              and available_at > now()
            ) or (
              entry_type in ('refund_reversal', 'chargeback_reversal')
              and exists (
                select 1
                from public.referral_commission_ledger parent
                where parent.id = ledger.parent_earning_id
                  and parent.entry_type = 'earning'
                  and parent.status = 'pending'
                  and parent.available_at > now()
              )
            )
          ), 0),
          'availableLedgerMinor', coalesce(sum(sub_admin_amount_minor) filter (
            where not (
              (
                entry_type = 'earning'
                and status = 'pending'
                and available_at > now()
              )
              or (
                entry_type in ('refund_reversal', 'chargeback_reversal')
                and exists (
                  select 1
                  from public.referral_commission_ledger parent
                  where parent.id = ledger.parent_earning_id
                    and parent.entry_type = 'earning'
                    and parent.status = 'pending'
                    and parent.available_at > now()
                )
              )
            )
          ), 0),
          'totalPaidMinor', coalesce((
            select sum(payout.amount_minor)
            from public.referral_payouts payout
            where payout.currency = ledger.currency and payout.status = 'paid'
          ), 0)
        ) as totals
        from public.referral_commission_ledger ledger
        group by currency
      ) financial_rows
    ), '{}'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.referral_admin_overview() from public, anon;
grant execute on function public.referral_admin_overview() to authenticated;
