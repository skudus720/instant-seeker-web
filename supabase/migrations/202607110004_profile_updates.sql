alter table public.profiles
  add column updated_at timestamptz not null default now();

comment on column public.profiles.updated_at is
  'Last successful member or administrator profile update.';

grant update (momo_number, updated_at) on public.profiles to authenticated;
