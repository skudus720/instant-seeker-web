alter table public.profiles
  add column momo_number text
  check (momo_number is null or momo_number ~ '^\+233[25][0-9]{8}$');

comment on column public.profiles.momo_number is
  'Private E.164 Ghana Mobile Money number used for account and payment matching.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_momo text;
begin
  normalized_momo := trim(coalesce(new.raw_user_meta_data ->> 'momo_number', ''));
  if normalized_momo !~ '^\+233[25][0-9]{8}$' then
    raise exception 'a valid Ghana Mobile Money number is required';
  end if;

  insert into public.profiles (
    id,
    display_name,
    momo_number,
    age_confirmed_at,
    accepted_terms_at
  ) values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60),
    normalized_momo,
    case when coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false) then now() end,
    case when coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false) then now() end
  );
  return new;
end;
$$;
