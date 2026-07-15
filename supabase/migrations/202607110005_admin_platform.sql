-- Instant Seeker administration foundation.
-- This migration is intentionally additive: it preserves the existing product
-- tables while introducing staff authorization, operational metadata, and
-- append-only audit history.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));

alter table public.profiles
  add column email text,
  add column account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'deletion_pending', 'anonymized', 'deleted')),
  add column suspended_until timestamptz,
  add column suspension_reason text,
  add column last_active_at timestamptz,
  add column deleted_at timestamptz,
  add column role_updated_at timestamptz,
  add column role_updated_by uuid references public.profiles(id) on delete set null;

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.email is null;

update public.profiles
set email = id::text || '@missing.invalid'
where email is null;

alter table public.profiles alter column email set not null;

create unique index profiles_email_unique_idx on public.profiles(lower(email));

update public.profiles
set last_active_at = coalesce(last_active_at, created_at)
where last_active_at is null;

create index profiles_role_status_idx
  on public.profiles(role, account_status, created_at desc);
create index profiles_last_active_idx
  on public.profiles(last_active_at desc);

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = coalesce(lower(new.email), new.id::text || '@missing.invalid')
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();

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
    id, email, display_name, momo_number, age_confirmed_at, accepted_terms_at
  ) values (
    new.id,
    coalesce(lower(new.email), new.id::text || '@missing.invalid'),
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60),
    normalized_momo,
    case when coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false) then now() end,
    case when coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false) then now() end
  );
  return new;
end;
$$;

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid references public.profiles(id) on delete set null,
  administrator_role text not null check (administrator_role in ('admin', 'super_admin', 'system')),
  action text not null check (char_length(action) between 3 and 120),
  target_entity_type text not null check (char_length(target_entity_type) between 2 and 80),
  target_entity_id text,
  previous_value_redacted jsonb,
  new_value_redacted jsonb,
  reason text not null check (char_length(reason) between 5 and 1000),
  request_metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index admin_audit_actor_created_idx
  on public.admin_audit_logs(administrator_id, created_at desc);
create index admin_audit_action_created_idx
  on public.admin_audit_logs(action, created_at desc);
create index admin_audit_target_idx
  on public.admin_audit_logs(target_entity_type, target_entity_id, created_at desc);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  target_entity_type text not null check (target_entity_type in ('user', 'analysis', 'win_record', 'review')),
  target_entity_id uuid not null,
  body text not null check (char_length(body) between 2 and 4000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index admin_notes_target_idx
  on public.admin_notes(target_entity_type, target_entity_id, created_at desc);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('review', 'win_record')),
  entity_id uuid not null,
  action text not null,
  previous_status text,
  new_status text,
  reason text not null check (char_length(reason) between 5 and 1000),
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index moderation_actions_entity_idx
  on public.moderation_actions(entity_type, entity_id, created_at desc);
create index moderation_actions_moderator_idx
  on public.moderation_actions(moderator_id, created_at desc);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_key text not null check (content_key ~ '^[a-z0-9_.-]{2,80}$'),
  version_number integer not null check (version_number > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  change_reason text not null check (char_length(change_reason) between 5 and 1000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_key, version_number)
);

create unique index content_versions_one_published_idx
  on public.content_versions(content_key)
  where status = 'published';
create index content_versions_key_created_idx
  on public.content_versions(content_key, created_at desc);

create table public.ai_config_versions (
  id uuid primary key default gen_random_uuid(),
  version_number integer not null unique check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  provider_name text not null check (char_length(provider_name) between 2 and 80),
  model_identifier text not null check (char_length(model_identifier) between 2 and 160),
  prompt_template_version text not null check (char_length(prompt_template_version) between 1 and 80),
  extraction_instructions text not null check (
    char_length(extraction_instructions) between 10 and 12000
    and extraction_instructions !~* '\m(hack|crack|bypass)\M'
  ),
  analysis_instructions text not null check (
    char_length(analysis_instructions) between 10 and 12000
    and analysis_instructions !~* '\m(hack|crack|bypass)\M'
  ),
  confidence_thresholds jsonb not null default '{"low":0.45,"medium":0.6,"high":0.75}'::jsonb
    check (
      jsonb_typeof(confidence_thresholds) = 'object'
      and jsonb_typeof(confidence_thresholds -> 'low') = 'number'
      and jsonb_typeof(confidence_thresholds -> 'medium') = 'number'
      and jsonb_typeof(confidence_thresholds -> 'high') = 'number'
      and (confidence_thresholds ->> 'low')::numeric between 0 and 1
      and (confidence_thresholds ->> 'medium')::numeric between 0 and 1
      and (confidence_thresholds ->> 'high')::numeric between 0 and 1
    ),
  risk_thresholds jsonb not null default '{"low":0.7,"medium":0.55,"high":0}'::jsonb
    check (
      jsonb_typeof(risk_thresholds) = 'object'
      and jsonb_typeof(risk_thresholds -> 'low') = 'number'
      and jsonb_typeof(risk_thresholds -> 'medium') = 'number'
      and jsonb_typeof(risk_thresholds -> 'high') = 'number'
      and (risk_thresholds ->> 'low')::numeric between 0 and 1
      and (risk_thresholds ->> 'medium')::numeric between 0 and 1
      and (risk_thresholds ->> 'high')::numeric between 0 and 1
    ),
  maximum_screenshot_bytes integer not null default 10485760 check (maximum_screenshot_bytes between 1024 and 20971520),
  accepted_mime_types text[] not null default array['image/jpeg','image/png','image/webp']
    check (
      cardinality(accepted_mime_types) between 1 and 3
      and accepted_mime_types <@ array['image/jpeg','image/png','image/webp']
    ),
  maximum_matches integer not null default 20 check (maximum_matches between 1 and 100),
  analysis_timeout_ms integer not null default 45000 check (analysis_timeout_ms between 1000 and 180000),
  retry_limit integer not null default 2 check (retry_limit between 0 and 10),
  per_user_daily_limit integer not null default 20 check (per_user_daily_limit between 1 and 1000),
  feature_flags jsonb not null default '{}'::jsonb check (jsonb_typeof(feature_flags) = 'object'),
  configuration_notes text not null check (char_length(configuration_notes) between 5 and 4000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  activated_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index ai_config_one_active_idx
  on public.ai_config_versions((status))
  where status = 'active';
create index ai_config_provider_created_idx
  on public.ai_config_versions(provider_name, model_identifier, created_at desc);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.-]{2,100}$'),
  category text not null check (category in ('general', 'safety', 'privacy', 'limits', 'features', 'security')),
  value jsonb not null,
  is_sensitive boolean not null default false,
  description text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index site_settings_category_idx on public.site_settings(category, key);

create table public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_.-]{2,100}$'),
  enabled boolean not null default false,
  description text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  source text not null check (char_length(source) between 2 and 100),
  event_type text not null check (char_length(event_type) between 2 and 120),
  message text not null check (char_length(message) between 2 and 2000),
  details_redacted jsonb not null default '{}'::jsonb,
  request_duration_ms integer check (request_duration_ms is null or request_duration_ms >= 0),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index system_events_severity_created_idx
  on public.system_events(severity, created_at desc);
create index system_events_type_created_idx
  on public.system_events(event_type, created_at desc);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  request_type text not null check (request_type in ('export', 'anonymization', 'deletion')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  reason text not null check (char_length(reason) between 5 and 1000),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index privacy_requests_status_created_idx
  on public.privacy_requests(status, created_at desc);
create index privacy_requests_user_idx
  on public.privacy_requests(user_id, created_at desc);

create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  scope text not null,
  blocked boolean not null default true,
  metadata_redacted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index rate_limit_events_user_created_idx
  on public.rate_limit_events(user_id, created_at desc);
create index rate_limit_events_scope_created_idx
  on public.rate_limit_events(scope, created_at desc);

create table public.rate_limit_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'all',
  reason text not null check (char_length(reason) between 5 and 1000),
  reset_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index rate_limit_resets_user_created_idx
  on public.rate_limit_resets(user_id, created_at desc);

create table public.analysis_retry_jobs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  use_active_configuration boolean not null default true,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message_redacted text,
  provider text,
  model_identifier text,
  configuration_version_id uuid references public.ai_config_versions(id) on delete set null,
  result jsonb,
  original_provider_response jsonb,
  processing_duration_ms integer check (processing_duration_ms is null or processing_duration_ms >= 0),
  created_at timestamptz not null default now()
);

create unique index analysis_retry_one_active_idx
  on public.analysis_retry_jobs(analysis_id)
  where status in ('pending', 'processing');
create index analysis_retry_status_created_idx
  on public.analysis_retry_jobs(status, created_at asc);

alter table public.analyses
  alter column private_image_path drop not null,
  add column model_identifier text,
  add column configuration_version_id uuid references public.ai_config_versions(id) on delete set null,
  add column overall_confidence_band text check (overall_confidence_band is null or overall_confidence_band in ('low', 'medium', 'high')),
  add column processing_started_at timestamptz,
  add column processing_completed_at timestamptz,
  add column processing_duration_ms integer check (processing_duration_ms is null or processing_duration_ms >= 0),
  add column admin_review_status text not null default 'unreviewed'
    check (admin_review_status in ('unreviewed', 'flagged', 'confirmed', 'false_positive', 'parsing_error')),
  add column upload_metadata jsonb not null default '{}'::jsonb,
  add column original_provider_response jsonb,
  add column admin_correction jsonb,
  add column correction_reason text,
  add column corrected_by uuid references public.profiles(id) on delete set null,
  add column corrected_at timestamptz,
  add column error_code text,
  add column error_message_redacted text;

create index analyses_admin_status_created_idx
  on public.analyses(status, admin_review_status, created_at desc);
create index analyses_provider_model_created_idx
  on public.analyses(provider, model_identifier, created_at desc);
create index analyses_config_version_idx
  on public.analyses(configuration_version_id, created_at desc);

alter table public.win_records drop constraint if exists win_records_verification_status_check;
alter table public.win_records
  add constraint win_records_verification_status_check
  check (verification_status in ('pending', 'under_review', 'verified', 'rejected', 'published', 'unpublished'));

alter table public.win_records
  add column linked_analysis_id uuid references public.analyses(id) on delete set null,
  add column amount_minor bigint,
  add column consent_to_publish boolean not null default false,
  add column consent_recorded_at timestamptz,
  add column privacy_safe_public_name text,
  add column moderator_id uuid references public.profiles(id) on delete set null,
  add column moderator_notes text,
  add column rejection_reason text,
  add column published_at timestamptz,
  add column requested_more_evidence_at timestamptz;

update public.win_records
set amount_minor = round(amount * 100)::bigint
where amount_minor is null;

alter table public.win_records
  alter column amount_minor set not null,
  add constraint win_records_amount_minor_positive_check check (amount_minor > 0);

create index win_records_admin_queue_idx
  on public.win_records(verification_status, created_at asc);
create index win_records_linked_analysis_idx
  on public.win_records(linked_analysis_id);

alter table public.reviews drop constraint if exists reviews_moderation_status_check;
alter table public.reviews
  add constraint reviews_moderation_status_check
  check (moderation_status in ('pending', 'approved', 'rejected', 'hidden'));

alter table public.reviews
  add column original_body text,
  add column redacted_body text,
  add column related_analysis_id uuid references public.analyses(id) on delete set null,
  add column moderator_id uuid references public.profiles(id) on delete set null,
  add column moderation_reason text;

update public.reviews set original_body = body where original_body is null;
alter table public.reviews alter column original_body set not null;

create index reviews_admin_queue_idx
  on public.reviews(moderation_status, created_at asc);
create index reviews_related_analysis_idx
  on public.reviews(related_analysis_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and deleted_at is null
      and (
        account_status = 'active'
        or (account_status = 'suspended' and suspended_until is not null and suspended_until <= now())
      )
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and deleted_at is null
      and (
        account_status = 'active'
        or (account_status = 'suspended' and suspended_until is not null and suspended_until <= now())
      )
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.redact_admin_json(source jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(source, '{}'::jsonb)
    - 'momo_number'
    - 'private_image_path'
    - 'ticket_image_path'
    - 'authorization'
    - 'access_token'
    - 'refresh_token'
    - 'api_key'
    - 'secret';
$$;

create or replace function public.bootstrap_first_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where role = 'super_admin') then
    raise exception 'a super administrator already exists';
  end if;

  update public.profiles
  set role = 'super_admin',
      account_status = 'active',
      role_updated_at = now(),
      role_updated_by = p_user_id
  where id = p_user_id;

  if not found then
    raise exception 'profile not found';
  end if;

  insert into public.admin_audit_logs (
    administrator_id, administrator_role, action, target_entity_type,
    target_entity_id, new_value_redacted, reason
  ) values (
    p_user_id, 'super_admin', 'staff.bootstrap_super_admin', 'user',
    p_user_id::text, jsonb_build_object('role', 'super_admin'),
    'Initial super administrator bootstrap'
  );
end;
$$;

revoke all on function public.bootstrap_first_super_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_first_super_admin(uuid) to service_role;

create or replace function public.get_public_content()
returns table (content_key text, content jsonb, published_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select content_key, content, published_at
  from public.content_versions
  where status = 'published'
  order by content_key;
$$;

revoke all on function public.get_public_content() from public;
grant execute on function public.get_public_content() to anon, authenticated;

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

  if new.verification_status = 'published'
    and new.verified_at is not null
    and new.published_at is not null
    and new.consent_to_publish = true
    and new.is_sample = false then
    select coalesce(
      nullif(trim(new.privacy_safe_public_name), ''),
      public.privacy_safe_name(display_name)
    ) into safe_name
    from public.profiles
    where id = new.user_id;

    insert into public.public_win_activity (
      id, display_name, amount, currency, verified_at, won_at, is_sample
    ) values (
      new.id, coalesce(safe_name, 'Verified member'), new.amount, new.currency,
      new.verified_at, new.won_at, false
    )
    on conflict (id) do update set
      display_name = excluded.display_name,
      amount = excluded.amount,
      currency = excluded.currency,
      verified_at = excluded.verified_at,
      won_at = excluded.won_at,
      is_sample = false;
  else
    delete from public.public_win_activity where id = new.id;
  end if;
  return new;
end;
$$;

-- Rebuild the projection after tightening publication and consent requirements.
-- Rows are re-added only by an audited status transition after this migration.
delete from public.public_win_activity;

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
      where verification_status = 'published'
        and verified_at is not null
        and published_at is not null
        and consent_to_publish = true
        and is_sample = false
        and currency = requested_currency
    ),
    (
      select coalesce(sum(amount), 0)
      from public.win_records
      where verification_status = 'published'
        and verified_at is not null
        and published_at is not null
        and consent_to_publish = true
        and is_sample = false
        and currency = requested_currency
    ),
    (
      select count(*)
      from public.analyses
      where status = 'completed'
        and provider <> 'deterministic-demo'
    ),
    (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where moderation_status = 'approved'
        and published_at is not null
        and is_sample = false
    );
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
    coalesce(reviews.redacted_body, reviews.original_body),
    reviews.published_at,
    true
  from public.reviews
  join public.profiles on profiles.id = reviews.user_id
  where reviews.moderation_status = 'approved'
    and reviews.published_at is not null
    and reviews.is_sample = false
    and profiles.account_status not in ('anonymized', 'deleted')
  order by reviews.published_at desc;
$$;

alter table public.admin_audit_logs enable row level security;
alter table public.admin_notes enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.content_versions enable row level security;
alter table public.ai_config_versions enable row level security;
alter table public.site_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.system_events enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.rate_limit_resets enable row level security;
alter table public.analysis_retry_jobs enable row level security;

create policy "audit_select_own_or_super"
on public.admin_audit_logs for select to authenticated
using (public.is_super_admin() or (public.is_admin() and administrator_id = auth.uid()));

create policy "admin_notes_staff_all"
on public.admin_notes for all to authenticated
using (public.is_admin()) with check (public.is_admin() and created_by = auth.uid());

create policy "moderation_actions_staff_read"
on public.moderation_actions for select to authenticated
using (public.is_admin());

create policy "content_versions_staff_read"
on public.content_versions for select to authenticated
using (public.is_admin());

create policy "ai_config_staff_read"
on public.ai_config_versions for select to authenticated
using (public.is_admin());

create policy "site_settings_staff_read"
on public.site_settings for select to authenticated
using (public.is_super_admin() or (public.is_admin() and is_sensitive = false));

create policy "feature_flags_super_read"
on public.feature_flags for select to authenticated
using (public.is_super_admin());

create policy "system_events_staff_read"
on public.system_events for select to authenticated
using (public.is_admin());

create policy "privacy_requests_staff_read"
on public.privacy_requests for select to authenticated
using (public.is_admin());

create policy "rate_limit_events_staff_read"
on public.rate_limit_events for select to authenticated
using (public.is_admin());

create policy "rate_limit_resets_staff_read"
on public.rate_limit_resets for select to authenticated
using (public.is_admin());

create policy "analysis_retry_staff_read"
on public.analysis_retry_jobs for select to authenticated
using (public.is_admin());

create policy "analyses_admin_read"
on public.analyses for select to authenticated
using (public.is_admin());

drop policy if exists "analysis_images_select_admin" on storage.objects;
create policy "analysis_images_select_admin"
on storage.objects for select to authenticated
using (bucket_id = 'analysis-screenshots' and public.is_admin());

revoke all on public.admin_audit_logs, public.moderation_actions,
  public.content_versions, public.ai_config_versions, public.site_settings,
  public.feature_flags, public.system_events, public.privacy_requests,
  public.rate_limit_events, public.rate_limit_resets,
  public.analysis_retry_jobs from anon, authenticated;

grant select on public.admin_audit_logs, public.moderation_actions,
  public.content_versions, public.ai_config_versions, public.site_settings,
  public.feature_flags, public.system_events, public.privacy_requests,
  public.rate_limit_events, public.rate_limit_resets,
  public.analysis_retry_jobs to authenticated;

revoke all on public.admin_notes from anon, authenticated;
grant select, insert on public.admin_notes to authenticated;

insert into public.site_settings (key, category, value, is_sensitive, description)
values
  ('general.site_name', 'general', '"Instant Seeker"'::jsonb, false, 'Public product name'),
  ('general.support_email', 'general', '"support@instantseeker.example"'::jsonb, false, 'Support contact address'),
  ('general.default_timezone', 'general', '"UTC"'::jsonb, false, 'Operational reporting timezone'),
  ('general.date_format', 'general', '"YYYY-MM-DD"'::jsonb, false, 'Default date display format'),
  ('general.currency_format', 'general', '"GHS"'::jsonb, false, 'Default display currency'),
  ('general.maintenance_mode', 'general', 'false'::jsonb, true, 'Site-wide maintenance state'),
  ('safety.minimum_age', 'safety', '18'::jsonb, false, 'Minimum member age'),
  ('safety.responsible_gaming_notice', 'safety', '"Use probability insights responsibly. Never stake more than you can afford to lose."'::jsonb, false, 'Responsible-gaming notice'),
  ('safety.non_affiliation_notice', 'safety', '"Instant Seeker is an independent service and is not affiliated with or endorsed by any betting platform."'::jsonb, false, 'Independent-service notice'),
  ('safety.support_resources', 'safety', '[]'::jsonb, false, 'Responsible-gaming support resources'),
  ('safety.uncertainty_notice', 'safety', '"Probability estimates are uncertain and never guarantee outcomes."'::jsonb, false, 'Required analysis notice'),
  ('privacy.signed_url_seconds', 'privacy', '300'::jsonb, true, 'Private evidence signed URL lifetime'),
  ('privacy.screenshot_retention_days', 'privacy', '30'::jsonb, true, 'Private screenshot retention'),
  ('privacy.analysis_retention_days', 'privacy', '365'::jsonb, true, 'Analysis record retention'),
  ('privacy.account_deletion_behavior', 'privacy', '"anonymize_integrity_records"'::jsonb, true, 'Account deletion behavior'),
  ('privacy.public_consent_default', 'privacy', 'false'::jsonb, true, 'Default public consent'),
  ('limits.upload_size_bytes', 'limits', '10485760'::jsonb, true, 'Maximum upload size'),
  ('limits.allowed_image_types', 'limits', '["image/jpeg","image/png","image/webp"]'::jsonb, true, 'Allowed screenshot MIME types'),
  ('limits.daily_analysis_limit', 'limits', '20'::jsonb, true, 'Default daily analysis limit'),
  ('limits.retry_limit', 'limits', '2'::jsonb, true, 'Default retry limit'),
  ('limits.admin_mutations_per_minute', 'limits', '60'::jsonb, true, 'Administrative mutation limit')
on conflict (key) do nothing;

insert into public.feature_flags (key, enabled, description)
values
  ('public_verified_activity', true, 'Show consented and published verified activity'),
  ('reviews', true, 'Allow and display approved reviews'),
  ('win_record_submission', true, 'Allow member win-record submissions'),
  ('new_registrations', true, 'Allow account registration'),
  ('screenshot_analysis', true, 'Allow new screenshot analyses'),
  ('maintenance_banner', false, 'Show the maintenance banner')
on conflict (key) do nothing;
