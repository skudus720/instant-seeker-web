-- Referral attribution and internal commission accounting.
-- Additive by design: Paystack continues to settle into the platform account.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'sub_admin', 'admin', 'super_admin'));

create or replace function public.is_sub_admin()
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
      and role = 'sub_admin'
      and deleted_at is null
      and (
        account_status = 'active'
        or (
          account_status = 'suspended'
          and suspended_until is not null
          and suspended_until <= now()
        )
      )
  );
$$;

revoke all on function public.is_sub_admin() from public, anon;
grant execute on function public.is_sub_admin() to authenticated;

create or replace function public.generate_referral_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select upper(encode(gen_random_bytes(8), 'hex'));
$$;

revoke all on function public.generate_referral_code() from public, anon, authenticated;

create table public.sub_admin_referral_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  referral_code text not null check (referral_code ~ '^[A-Z0-9_-]{10,32}$'),
  referral_enabled boolean not null default true,
  commission_rate_basis_points integer not null default 7000
    check (commission_rate_basis_points between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index sub_admin_referral_code_ci_unique_idx
  on public.sub_admin_referral_profiles(lower(referral_code));
create index sub_admin_referral_enabled_idx
  on public.sub_admin_referral_profiles(referral_enabled, created_at desc);

create or replace function public.ensure_sub_admin_referral_profile(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
  v_attempt integer;
begin
  select id into v_id
  from public.sub_admin_referral_profiles
  where user_id = p_user_id;

  if found then
    update public.sub_admin_referral_profiles
    set referral_enabled = true, updated_at = now()
    where id = v_id;
    return v_id;
  end if;

  for v_attempt in 1..12 loop
    v_code := public.generate_referral_code();
    begin
      insert into public.sub_admin_referral_profiles (
        user_id, referral_code, referral_enabled, commission_rate_basis_points
      ) values (
        p_user_id, v_code, true, 7000
      ) returning id into v_id;
      return v_id;
    exception when unique_violation then
      -- A cryptographically improbable collision is retried with fresh bytes.
    end;
  end loop;

  raise exception 'unable to allocate a unique referral code';
end;
$$;

revoke all on function public.ensure_sub_admin_referral_profile(uuid)
  from public, anon, authenticated;

create or replace function public.sync_sub_admin_referral_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'sub_admin' then
    perform public.ensure_sub_admin_referral_profile(new.id);
  elsif tg_op = 'UPDATE' and old.role = 'sub_admin' then
    update public.sub_admin_referral_profiles
    set referral_enabled = false, updated_at = now()
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_sub_admin_referral_profile_after_role on public.profiles;
create trigger sync_sub_admin_referral_profile_after_role
  after insert or update of role on public.profiles
  for each row execute procedure public.sync_sub_admin_referral_profile();

-- Backfill is safe to rerun and does not alter existing codes.
select public.ensure_sub_admin_referral_profile(id)
from public.profiles
where role = 'sub_admin';

create table public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_profile_id uuid not null
    references public.sub_admin_referral_profiles(id) on delete restrict,
  sub_admin_id uuid not null references public.profiles(id) on delete restrict,
  referral_code_snapshot text not null,
  visitor_token_hash text not null check (visitor_token_hash ~ '^[a-f0-9]{64}$'),
  landing_page text not null default '/signup' check (char_length(landing_page) between 1 and 500),
  event_type text not null default 'click'
    check (event_type in ('click', 'repeat_click')),
  created_at timestamptz not null default now()
);

create index referral_clicks_profile_created_idx
  on public.referral_clicks(referral_profile_id, created_at desc);
create index referral_clicks_sub_admin_created_idx
  on public.referral_clicks(sub_admin_id, created_at desc);
create index referral_clicks_visitor_idx
  on public.referral_clicks(visitor_token_hash, created_at desc);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referral_profile_id uuid not null
    references public.sub_admin_referral_profiles(id) on delete restrict,
  sub_admin_id uuid not null references public.profiles(id) on delete restrict,
  referral_code_snapshot text not null,
  visitor_token_hash text not null unique check (visitor_token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid references public.profiles(id) on delete set null,
  commission_rate_basis_points integer not null
    check (commission_rate_basis_points between 0 and 10000),
  attributed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null default 'referral_link' check (char_length(source) between 2 and 80),
  landing_page text not null default '/signup' check (char_length(landing_page) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > attributed_at),
  check (user_id is null or user_id <> sub_admin_id)
);

create unique index referral_attributions_one_user_idx
  on public.referral_attributions(user_id)
  where user_id is not null;
create index referral_attributions_profile_created_idx
  on public.referral_attributions(referral_profile_id, attributed_at desc);
create index referral_attributions_sub_admin_created_idx
  on public.referral_attributions(sub_admin_id, attributed_at desc);
create index referral_attributions_expires_idx
  on public.referral_attributions(expires_at)
  where user_id is null;

alter table public.signup_payments
  add column referral_attribution_id uuid references public.referral_attributions(id) on delete restrict,
  add column referral_profile_id uuid references public.sub_admin_referral_profiles(id) on delete restrict,
  add column referring_sub_admin_id uuid references public.profiles(id) on delete restrict,
  add column referral_code_snapshot text,
  add column sub_admin_rate_basis_points integer
    check (sub_admin_rate_basis_points is null or sub_admin_rate_basis_points between 0 and 10000),
  add column super_admin_rate_basis_points integer
    check (super_admin_rate_basis_points is null or super_admin_rate_basis_points between 0 and 10000),
  add column discount_amount_minor bigint not null default 0 check (discount_amount_minor >= 0),
  add column refund_amount_minor bigint not null default 0 check (refund_amount_minor >= 0),
  add column processing_fee_minor bigint not null default 0 check (processing_fee_minor >= 0),
  add column direct_cost_minor bigint not null default 0 check (direct_cost_minor >= 0),
  add column net_profit_minor bigint,
  add column provider_transaction_id text,
  add column updated_at timestamptz not null default now(),
  add constraint signup_payment_referral_snapshot_check check (
    (referring_sub_admin_id is null and referral_profile_id is null and referral_code_snapshot is null)
    or (
      referring_sub_admin_id is not null
      and referral_profile_id is not null
      and referral_code_snapshot is not null
      and sub_admin_rate_basis_points is not null
      and super_admin_rate_basis_points is not null
      and sub_admin_rate_basis_points + super_admin_rate_basis_points = 10000
    )
  );

alter table public.ai_subscriptions
  add column referral_attribution_id uuid references public.referral_attributions(id) on delete restrict,
  add column referral_profile_id uuid references public.sub_admin_referral_profiles(id) on delete restrict,
  add column referring_sub_admin_id uuid references public.profiles(id) on delete restrict,
  add column referral_code_snapshot text,
  add column sub_admin_rate_basis_points integer
    check (sub_admin_rate_basis_points is null or sub_admin_rate_basis_points between 0 and 10000),
  add column super_admin_rate_basis_points integer
    check (super_admin_rate_basis_points is null or super_admin_rate_basis_points between 0 and 10000),
  add column discount_amount_minor bigint not null default 0 check (discount_amount_minor >= 0),
  add column refund_amount_minor bigint not null default 0 check (refund_amount_minor >= 0),
  add column processing_fee_minor bigint not null default 0 check (processing_fee_minor >= 0),
  add column direct_cost_minor bigint not null default 0 check (direct_cost_minor >= 0),
  add column net_profit_minor bigint,
  add column provider_transaction_id text,
  add column updated_at timestamptz not null default now(),
  add constraint ai_subscription_referral_snapshot_check check (
    (referring_sub_admin_id is null and referral_profile_id is null and referral_code_snapshot is null)
    or (
      referring_sub_admin_id is not null
      and referral_profile_id is not null
      and referral_code_snapshot is not null
      and sub_admin_rate_basis_points is not null
      and super_admin_rate_basis_points is not null
      and sub_admin_rate_basis_points + super_admin_rate_basis_points = 10000
    )
  );

create index signup_payments_referral_idx
  on public.signup_payments(referring_sub_admin_id, created_at desc)
  where referring_sub_admin_id is not null;
create index ai_subscriptions_referral_idx
  on public.ai_subscriptions(referring_sub_admin_id, created_at desc)
  where referring_sub_admin_id is not null;

create table public.referral_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  referral_profile_id uuid not null
    references public.sub_admin_referral_profiles(id) on delete restrict,
  sub_admin_id uuid not null references public.profiles(id) on delete restrict,
  customer_id uuid references public.profiles(id) on delete set null,
  referral_attribution_id uuid references public.referral_attributions(id) on delete restrict,
  source_payment_type text not null check (source_payment_type in ('signup', 'subscription', 'manual')),
  source_payment_id uuid,
  payment_reference text,
  provider_transaction_id text,
  provider_event_id text,
  parent_earning_id uuid references public.referral_commission_ledger(id) on delete restrict,
  entry_type text not null
    check (entry_type in ('earning', 'refund_reversal', 'chargeback_reversal', 'adjustment')),
  status text not null
    check (status in ('pending', 'available', 'paid', 'reversed', 'adjusted')),
  product_code text,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  gross_amount_minor bigint not null check (gross_amount_minor >= 0),
  discount_amount_minor bigint not null default 0 check (discount_amount_minor >= 0),
  refund_amount_minor bigint not null default 0 check (refund_amount_minor >= 0),
  processing_fee_minor bigint not null default 0 check (processing_fee_minor >= 0),
  direct_cost_minor bigint not null default 0 check (direct_cost_minor >= 0),
  net_profit_minor bigint not null,
  sub_admin_rate_basis_points integer not null check (sub_admin_rate_basis_points between 0 and 10000),
  sub_admin_amount_minor bigint not null,
  super_admin_rate_basis_points integer not null check (super_admin_rate_basis_points between 0 and 10000),
  super_admin_amount_minor bigint not null,
  available_at timestamptz not null,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sub_admin_rate_basis_points + super_admin_rate_basis_points = 10000),
  check (sub_admin_amount_minor + super_admin_amount_minor = net_profit_minor),
  check (
    (entry_type = 'earning' and parent_earning_id is null and net_profit_minor >= 0)
    or (entry_type in ('refund_reversal', 'chargeback_reversal') and parent_earning_id is not null and net_profit_minor <= 0)
    or entry_type = 'adjustment'
  )
);

create unique index referral_commission_provider_event_unique_idx
  on public.referral_commission_ledger(provider_event_id)
  where provider_event_id is not null;
create unique index referral_commission_one_earning_per_payment_idx
  on public.referral_commission_ledger(source_payment_type, payment_reference)
  where entry_type = 'earning';
create index referral_commission_sub_admin_created_idx
  on public.referral_commission_ledger(sub_admin_id, created_at desc);
create index referral_commission_profile_status_available_idx
  on public.referral_commission_ledger(referral_profile_id, status, available_at, created_at);
create index referral_commission_payment_idx
  on public.referral_commission_ledger(payment_reference, source_payment_type);
create index referral_commission_parent_idx
  on public.referral_commission_ledger(parent_earning_id, created_at);
create index referral_commission_customer_idx
  on public.referral_commission_ledger(customer_id, created_at desc);

create or replace function public.protect_referral_ledger_financial_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referral_profile_id is distinct from old.referral_profile_id
    or new.sub_admin_id is distinct from old.sub_admin_id
    or (
      new.customer_id is distinct from old.customer_id
      and new.customer_id is not null
    )
    or new.referral_attribution_id is distinct from old.referral_attribution_id
    or new.source_payment_type is distinct from old.source_payment_type
    or new.source_payment_id is distinct from old.source_payment_id
    or new.payment_reference is distinct from old.payment_reference
    or new.provider_transaction_id is distinct from old.provider_transaction_id
    or new.provider_event_id is distinct from old.provider_event_id
    or new.parent_earning_id is distinct from old.parent_earning_id
    or new.entry_type is distinct from old.entry_type
    or new.product_code is distinct from old.product_code
    or new.currency is distinct from old.currency
    or new.gross_amount_minor is distinct from old.gross_amount_minor
    or new.discount_amount_minor is distinct from old.discount_amount_minor
    or new.refund_amount_minor is distinct from old.refund_amount_minor
    or new.processing_fee_minor is distinct from old.processing_fee_minor
    or new.direct_cost_minor is distinct from old.direct_cost_minor
    or new.net_profit_minor is distinct from old.net_profit_minor
    or new.sub_admin_rate_basis_points is distinct from old.sub_admin_rate_basis_points
    or new.sub_admin_amount_minor is distinct from old.sub_admin_amount_minor
    or new.super_admin_rate_basis_points is distinct from old.super_admin_rate_basis_points
    or new.super_admin_amount_minor is distinct from old.super_admin_amount_minor
    or new.available_at is distinct from old.available_at
    or new.metadata is distinct from old.metadata
    or new.idempotency_key is distinct from old.idempotency_key then
    raise exception 'commission financial fields are immutable';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_referral_ledger_financial_fields_before_update
  before update on public.referral_commission_ledger
  for each row execute procedure public.protect_referral_ledger_financial_fields();

create or replace function public.prevent_referral_ledger_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'commission ledger entries are append-only';
end;
$$;

create trigger prevent_referral_ledger_delete_before_delete
  before delete on public.referral_commission_ledger
  for each row execute procedure public.prevent_referral_ledger_delete();

create table public.referral_payouts (
  id uuid primary key default gen_random_uuid(),
  referral_profile_id uuid not null
    references public.sub_admin_referral_profiles(id) on delete restrict,
  sub_admin_id uuid not null references public.profiles(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  payment_method text not null check (char_length(payment_method) between 2 and 80),
  external_reference text not null check (char_length(external_reference) between 2 and 160),
  notes text check (notes is null or char_length(notes) <= 2000),
  period_start timestamptz,
  period_end timestamptz,
  payout_date timestamptz not null,
  created_by_super_admin_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start),
  check ((status = 'paid' and paid_at is not null) or status <> 'paid')
);

create unique index referral_payout_external_reference_unique_idx
  on public.referral_payouts(lower(external_reference));
create index referral_payout_sub_admin_created_idx
  on public.referral_payouts(sub_admin_id, created_at desc);
create index referral_payout_profile_status_idx
  on public.referral_payouts(referral_profile_id, status, payout_date desc);

create table public.referral_payout_allocations (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.referral_payouts(id) on delete restrict,
  ledger_entry_id uuid not null references public.referral_commission_ledger(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now(),
  unique (payout_id, ledger_entry_id)
);

create index referral_payout_allocations_ledger_idx
  on public.referral_payout_allocations(ledger_entry_id, created_at);

create or replace function public.protect_referral_payout_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referral_profile_id is distinct from old.referral_profile_id
    or new.sub_admin_id is distinct from old.sub_admin_id
    or new.currency is distinct from old.currency
    or new.amount_minor is distinct from old.amount_minor
    or new.payment_method is distinct from old.payment_method
    or new.external_reference is distinct from old.external_reference
    or new.notes is distinct from old.notes
    or new.period_start is distinct from old.period_start
    or new.period_end is distinct from old.period_end
    or new.payout_date is distinct from old.payout_date
    or new.created_by_super_admin_id is distinct from old.created_by_super_admin_id
    or new.created_at is distinct from old.created_at
    or new.paid_at is distinct from old.paid_at then
    raise exception 'payout financial fields are immutable';
  end if;
  if new.status is distinct from old.status
    and not (
      (old.status = 'pending' and new.status in ('paid', 'failed', 'cancelled'))
      or (old.status = 'paid' and new.status = 'cancelled')
    ) then
    raise exception 'invalid payout status transition';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_referral_payout_history_before_update
  before update on public.referral_payouts
  for each row execute procedure public.protect_referral_payout_history();

create or replace function public.prevent_referral_finance_history_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'referral financial history is append-only';
end;
$$;

create trigger prevent_referral_payout_delete_before_delete
  before delete on public.referral_payouts
  for each row execute procedure public.prevent_referral_finance_history_change();

create trigger prevent_referral_allocation_update_before_update
  before update on public.referral_payout_allocations
  for each row execute procedure public.prevent_referral_finance_history_change();

create trigger prevent_referral_allocation_delete_before_delete
  before delete on public.referral_payout_allocations
  for each row execute procedure public.prevent_referral_finance_history_change();

alter table public.sub_admin_referral_profiles enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_commission_ledger enable row level security;
alter table public.referral_payouts enable row level security;
alter table public.referral_payout_allocations enable row level security;

create policy "referral_profiles_select_own_or_super_admin"
on public.sub_admin_referral_profiles for select to authenticated
using (user_id = auth.uid() or public.is_super_admin());

create policy "referral_clicks_select_own_or_super_admin"
on public.referral_clicks for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.sub_admin_referral_profiles profile
    where profile.id = referral_clicks.referral_profile_id
      and profile.user_id = auth.uid()
  )
);

create policy "referral_attributions_select_own_partner_or_super_admin"
on public.referral_attributions for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.sub_admin_referral_profiles profile
    where profile.id = referral_attributions.referral_profile_id
      and profile.user_id = auth.uid()
  )
);

create policy "referral_ledger_select_own_or_super_admin"
on public.referral_commission_ledger for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.sub_admin_referral_profiles profile
    where profile.id = referral_commission_ledger.referral_profile_id
      and profile.user_id = auth.uid()
  )
);

create policy "referral_payouts_select_own_or_super_admin"
on public.referral_payouts for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.sub_admin_referral_profiles profile
    where profile.id = referral_payouts.referral_profile_id
      and profile.user_id = auth.uid()
  )
);

create policy "referral_allocations_select_own_or_super_admin"
on public.referral_payout_allocations for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.referral_payouts payout
    join public.sub_admin_referral_profiles profile
      on profile.id = payout.referral_profile_id
    where payout.id = referral_payout_allocations.payout_id
      and profile.user_id = auth.uid()
  )
);

revoke all on public.sub_admin_referral_profiles,
  public.referral_clicks,
  public.referral_attributions,
  public.referral_commission_ledger,
  public.referral_payouts,
  public.referral_payout_allocations
from anon, authenticated;

grant select on public.sub_admin_referral_profiles,
  public.referral_clicks,
  public.referral_attributions,
  public.referral_commission_ledger,
  public.referral_payouts,
  public.referral_payout_allocations
to authenticated;

comment on table public.referral_commission_ledger is
  'Internal commission ledger only. Provider funds remain in the platform Paystack account.';
comment on column public.referral_commission_ledger.net_profit_minor is
  'Profit snapshot in minor units after tracked discounts, fees, and direct costs.';
