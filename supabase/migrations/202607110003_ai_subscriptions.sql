create table public.ai_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null check (plan_code in ('gold', 'platinum', 'diamond')),
  provider text not null default 'paystack' check (provider = 'paystack'),
  provider_reference text not null unique,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'failed', 'refunded')),
  starts_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'active' and starts_at is not null and expires_at > starts_at and paid_at is not null)
    or status <> 'active'
  )
);

create index ai_subscriptions_user_expiry_idx
  on public.ai_subscriptions(user_id, expires_at desc);

alter table public.ai_subscriptions enable row level security;

create policy "ai_subscriptions_select_own_or_admin"
on public.ai_subscriptions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

revoke all on public.ai_subscriptions from anon, authenticated;
grant select on public.ai_subscriptions to authenticated;

create or replace function public.has_active_ai_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.ai_subscriptions
    where user_id = auth.uid()
      and status = 'active'
      and starts_at <= now()
      and expires_at > now()
  );
$$;

revoke all on function public.has_active_ai_subscription() from public, anon;
grant execute on function public.has_active_ai_subscription() to authenticated;

drop policy if exists "analyses_insert_own_active" on public.analyses;
drop policy if exists "analyses_update_own_active" on public.analyses;

create policy "analyses_insert_own_subscribed"
on public.analyses for insert to authenticated
with check (
  user_id = auth.uid()
  and public.has_active_access()
  and public.has_active_ai_subscription()
);

create policy "analyses_update_own_subscribed"
on public.analyses for update to authenticated
using (
  user_id = auth.uid()
  and public.has_active_access()
  and public.has_active_ai_subscription()
)
with check (
  user_id = auth.uid()
  and public.has_active_access()
  and public.has_active_ai_subscription()
);

drop policy if exists "analysis_images_insert_own_active" on storage.objects;

create policy "analysis_images_insert_own_subscribed"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'analysis-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_active_access()
  and public.has_active_ai_subscription()
);

create or replace function public.record_successful_ai_subscription(
  p_user_id uuid,
  p_plan_code text,
  p_reference text,
  p_amount_minor integer,
  p_currency text,
  p_paid_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration interval;
  v_expected_amount integer;
  v_existing public.ai_subscriptions%rowtype;
  v_latest_expiry timestamptz;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  case p_plan_code
    when 'gold' then
      v_expected_amount := 35000;
      v_duration := interval '24 hours';
    when 'platinum' then
      v_expected_amount := 85000;
      v_duration := interval '48 hours';
    when 'diamond' then
      v_expected_amount := 150000;
      v_duration := interval '72 hours';
    else
      raise exception 'unknown AI subscription plan';
  end case;

  if p_amount_minor <> v_expected_amount or p_currency <> 'GHS' then
    raise exception 'AI subscription amount or currency mismatch';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and access_status = 'active'
  ) then
    raise exception 'paid account access is required';
  end if;

  select * into v_existing
  from public.ai_subscriptions
  where provider_reference = p_reference
  for update;

  if found and v_existing.status = 'active' then
    if v_existing.user_id <> p_user_id
      or v_existing.plan_code <> p_plan_code
      or v_existing.amount_minor <> p_amount_minor
      or v_existing.currency <> p_currency then
      raise exception 'payment reference belongs to another subscription';
    end if;
    return;
  end if;

  select expires_at into v_latest_expiry
  from public.ai_subscriptions
  where user_id = p_user_id
    and status = 'active'
    and expires_at > p_paid_at
  order by expires_at desc
  limit 1
  for update;

  v_starts_at := greatest(p_paid_at, coalesce(v_latest_expiry, p_paid_at));
  v_expires_at := v_starts_at + v_duration;

  insert into public.ai_subscriptions (
    user_id,
    plan_code,
    provider,
    provider_reference,
    amount_minor,
    currency,
    status,
    starts_at,
    expires_at,
    paid_at
  ) values (
    p_user_id,
    p_plan_code,
    'paystack',
    p_reference,
    p_amount_minor,
    p_currency,
    'active',
    v_starts_at,
    v_expires_at,
    p_paid_at
  )
  on conflict (provider_reference) do update set
    amount_minor = excluded.amount_minor,
    currency = excluded.currency,
    status = 'active',
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    paid_at = excluded.paid_at
  where public.ai_subscriptions.user_id = excluded.user_id
    and public.ai_subscriptions.plan_code = excluded.plan_code;

  if not found then
    raise exception 'payment reference belongs to another subscription';
  end if;
end;
$$;

revoke all on function public.record_successful_ai_subscription(
  uuid, text, text, integer, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_successful_ai_subscription(
  uuid, text, text, integer, text, timestamptz
) to service_role;
