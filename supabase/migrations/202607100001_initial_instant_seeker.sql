create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  age_confirmed_at timestamptz,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  private_image_path text not null,
  extracted_matches jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  provider text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table public.win_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  ticket_image_path text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  won_at timestamptz not null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 20 and 1000),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  published_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- This table contains the only winner fields exposed to anonymous realtime clients.
create table public.public_win_activity (
  id uuid primary key references public.win_records(id) on delete cascade,
  display_name text not null,
  amount numeric(14, 2) not null,
  currency text not null,
  verified_at timestamptz not null,
  won_at timestamptz not null,
  is_sample boolean not null default false
);

create index analyses_user_created_idx on public.analyses(user_id, created_at desc);
create index analyses_completed_idx on public.analyses(status, created_at desc) where status = 'completed';
create index wins_verification_idx on public.win_records(verification_status, verified_at desc);
create index reviews_moderation_idx on public.reviews(moderation_status, published_at desc);
create index public_win_activity_verified_idx on public.public_win_activity(verified_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.privacy_safe_name(source_name text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
  first_name text;
  last_initial text;
begin
  parts := regexp_split_to_array(trim(coalesce(source_name, '')), '\s+');
  if array_length(parts, 1) is null then
    return 'Verified member';
  end if;
  first_name := left(parts[1], 12);
  if array_length(parts, 1) = 1 then
    return first_name;
  end if;
  last_initial := upper(left(parts[array_length(parts, 1)], 1));
  return first_name || ' ' || last_initial || '.';
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    age_confirmed_at,
    accepted_terms_at
  ) values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60),
    case when coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false) then now() end,
    case when coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false) then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.sync_public_win_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_name text;
begin
  if tg_op = 'DELETE' then
    delete from public.public_win_activity where id = old.id;
    return old;
  end if;

  if new.verification_status = 'verified' and new.verified_at is not null then
    select public.privacy_safe_name(display_name)
      into safe_name
      from public.profiles
      where id = new.user_id;

    insert into public.public_win_activity (
      id, display_name, amount, currency, verified_at, won_at, is_sample
    ) values (
      new.id, coalesce(safe_name, 'Verified member'), new.amount, new.currency,
      new.verified_at, new.won_at, new.is_sample
    )
    on conflict (id) do update set
      display_name = excluded.display_name,
      amount = excluded.amount,
      currency = excluded.currency,
      verified_at = excluded.verified_at,
      won_at = excluded.won_at,
      is_sample = excluded.is_sample;
  else
    delete from public.public_win_activity where id = new.id;
  end if;
  return new;
end;
$$;

create trigger sync_public_win_activity_after_change
after insert or update or delete on public.win_records
for each row execute procedure public.sync_public_win_activity();

create or replace function public.get_public_stats(requested_currency text default 'GHS')
returns table (
  verified_winners bigint,
  total_verified_amount_won numeric,
  screenshots_analyzed bigint,
  average_published_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(distinct user_id)
      from public.win_records
      where verification_status = 'verified'
        and is_sample = false
        and currency = requested_currency
    ) as verified_winners,
    (
      select coalesce(sum(amount), 0)
      from public.win_records
      where verification_status = 'verified'
        and is_sample = false
        and currency = requested_currency
    ) as total_verified_amount_won,
    (
      select count(*)
      from public.analyses
      where status = 'completed'
        and provider <> 'deterministic-demo'
    ) as screenshots_analyzed,
    (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where moderation_status = 'approved'
        and is_sample = false
    ) as average_published_rating;
$$;

create or replace function public.get_public_reviews()
returns table (
  id uuid,
  display_name text,
  rating smallint,
  body text,
  published_at timestamptz,
  verified_member boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    reviews.id,
    public.privacy_safe_name(profiles.display_name),
    reviews.rating,
    reviews.body,
    reviews.published_at,
    true
  from public.reviews
  join public.profiles on profiles.id = reviews.user_id
  where reviews.moderation_status = 'approved'
    and reviews.published_at is not null
    and reviews.is_sample = false
  order by reviews.published_at desc;
$$;

alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.win_records enable row level security;
alter table public.reviews enable row level security;
alter table public.public_win_activity enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "analyses_select_own"
on public.analyses for select to authenticated
using (user_id = auth.uid());

create policy "analyses_insert_own"
on public.analyses for insert to authenticated
with check (user_id = auth.uid());

create policy "analyses_update_own"
on public.analyses for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "analyses_delete_own"
on public.analyses for delete to authenticated
using (user_id = auth.uid());

create policy "wins_select_own_or_admin"
on public.win_records for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "wins_insert_own_pending"
on public.win_records for insert to authenticated
with check (
  user_id = auth.uid()
  and verification_status = 'pending'
  and verified_at is null
  and is_sample = false
);

create policy "wins_update_admin"
on public.win_records for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "wins_delete_own_pending_or_admin"
on public.win_records for delete to authenticated
using (
  public.is_admin()
  or (user_id = auth.uid() and verification_status = 'pending')
);

create policy "reviews_select_own_or_admin"
on public.reviews for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "reviews_insert_own_pending"
on public.reviews for insert to authenticated
with check (
  user_id = auth.uid()
  and moderation_status = 'pending'
  and published_at is null
  and is_sample = false
);

create policy "reviews_update_admin"
on public.reviews for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "reviews_delete_own_pending_or_admin"
on public.reviews for delete to authenticated
using (
  public.is_admin()
  or (user_id = auth.uid() and moderation_status = 'pending')
);

create policy "public_activity_verified_read"
on public.public_win_activity for select to anon, authenticated
using (is_sample = false);

revoke all on public.profiles, public.analyses, public.win_records, public.reviews from anon;
revoke all on public.profiles, public.analyses, public.win_records, public.reviews from authenticated;
revoke all on public.public_win_activity from anon, authenticated;
grant select on public.public_win_activity to anon, authenticated;
grant select, delete on public.analyses to authenticated;
grant select, insert, delete on public.win_records to authenticated;
grant update (verification_status, verified_at) on public.win_records to authenticated;
grant select, insert, delete on public.reviews to authenticated;
grant update (moderation_status, published_at) on public.reviews to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant execute on function public.get_public_stats(text) to anon, authenticated;
grant execute on function public.get_public_reviews() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-screenshots',
  'analysis-screenshots',
  false,
  10485760,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'win-records',
  'win-records',
  false,
  10485760,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = false;

create policy "analysis_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'analysis-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "analysis_images_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'analysis-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "analysis_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'analysis-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "win_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'win-records'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "win_images_select_own_or_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'win-records'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

create policy "win_images_delete_own_or_admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'win-records'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'public_win_activity'
  ) then
    alter publication supabase_realtime add table public.public_win_activity;
  end if;
end;
$$;
