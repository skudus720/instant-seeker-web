alter table public.profiles add column access_status text;
alter table public.profiles add column paid_at timestamptz;

-- Preserve access for accounts created before paid signup was introduced.
update public.profiles set access_status = 'active' where access_status is null;

alter table public.profiles
  alter column access_status set default 'payment_pending',
  alter column access_status set not null;

alter table public.profiles
  add constraint profiles_access_status_check
  check (access_status in ('payment_pending', 'active', 'refunded'));

create table public.signup_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'paystack' check (provider = 'paystack'),
  provider_reference text not null unique,
  amount_minor integer not null default 5000 check (amount_minor > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index signup_payments_user_created_idx
  on public.signup_payments(user_id, created_at desc);

alter table public.signup_payments enable row level security;

create policy "signup_payments_select_own_or_admin"
on public.signup_payments for select to authenticated
using (user_id = auth.uid() or public.is_admin());

revoke all on public.signup_payments from anon, authenticated;
grant select on public.signup_payments to authenticated;

create or replace function public.has_active_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (access_status = 'active' or role = 'admin')
  );
$$;

revoke all on function public.has_active_access() from public, anon;
grant execute on function public.has_active_access() to authenticated;

drop policy if exists "analyses_select_own" on public.analyses;
drop policy if exists "analyses_insert_own" on public.analyses;
drop policy if exists "analyses_update_own" on public.analyses;

create policy "analyses_select_own_active"
on public.analyses for select to authenticated
using (user_id = auth.uid() and public.has_active_access());

create policy "analyses_insert_own_active"
on public.analyses for insert to authenticated
with check (user_id = auth.uid() and public.has_active_access());

create policy "analyses_update_own_active"
on public.analyses for update to authenticated
using (user_id = auth.uid() and public.has_active_access())
with check (user_id = auth.uid() and public.has_active_access());

drop policy if exists "analysis_images_insert_own" on storage.objects;
drop policy if exists "analysis_images_select_own" on storage.objects;

create policy "analysis_images_insert_own_active"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'analysis-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_active_access()
);

create policy "analysis_images_select_own_active"
on storage.objects for select to authenticated
using (
  bucket_id = 'analysis-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_active_access()
);

create or replace function public.record_successful_signup_payment(
  p_user_id uuid,
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
begin
  if p_amount_minor <> 5000 or p_currency <> 'GHS' then
    raise exception 'signup payment amount or currency mismatch';
  end if;

  insert into public.signup_payments (
    user_id,
    provider,
    provider_reference,
    amount_minor,
    currency,
    status,
    paid_at
  ) values (
    p_user_id,
    'paystack',
    p_reference,
    p_amount_minor,
    p_currency,
    'succeeded',
    p_paid_at
  )
  on conflict (provider_reference) do update set
    amount_minor = excluded.amount_minor,
    currency = excluded.currency,
    status = 'succeeded',
    paid_at = excluded.paid_at
  where public.signup_payments.user_id = excluded.user_id;

  if not found then
    raise exception 'payment reference belongs to another account';
  end if;

  update public.profiles
  set access_status = 'active', paid_at = p_paid_at
  where id = p_user_id;

  if not found then
    raise exception 'signup account not found';
  end if;
end;
$$;

revoke all on function public.record_successful_signup_payment(
  uuid, text, integer, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_successful_signup_payment(
  uuid, text, integer, text, timestamptz
) to service_role;
