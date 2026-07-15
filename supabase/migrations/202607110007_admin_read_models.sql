-- Read-optimized administrative aggregates. These functions return only
-- operational fields and require an active staff session.

create or replace function public.admin_dashboard_metrics(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > interval '366 days' then
    raise exception 'invalid reporting range';
  end if;

  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'totalUsers', (select count(*) from public.profiles where deleted_at is null),
      'newUsersToday', (select count(*) from public.profiles where created_at >= date_trunc('day', now()) and deleted_at is null),
      'activeUsers24h', (select count(*) from public.profiles where last_active_at >= now() - interval '24 hours' and deleted_at is null),
      'activeUsers7d', (select count(*) from public.profiles where last_active_at >= now() - interval '7 days' and deleted_at is null),
      'activeUsers30d', (select count(*) from public.profiles where last_active_at >= now() - interval '30 days' and deleted_at is null),
      'totalAnalyses', (select count(*) from public.analyses),
      'analysesCompletedToday', (select count(*) from public.analyses where status = 'completed' and created_at >= date_trunc('day', now())),
      'pendingAnalyses', (select count(*) from public.analyses where status in ('pending', 'processing')),
      'failedAnalyses', (select count(*) from public.analyses where status = 'failed'),
      'analysisCompletionRate', (
        select coalesce(round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*) filter (where status in ('completed', 'failed')), 0), 1), 0)
        from public.analyses where created_at >= p_from and created_at < p_to
      ),
      'averageProcessingMs', (
        select coalesce(round(avg(processing_duration_ms)), 0)
        from public.analyses
        where status = 'completed' and processing_duration_ms is not null
          and created_at >= p_from and created_at < p_to
      ),
      'reviewsAwaitingModeration', (select count(*) from public.reviews where moderation_status = 'pending'),
      'winsAwaitingVerification', (select count(*) from public.win_records where verification_status in ('pending', 'under_review')),
      'verifiedPublicWins', (
        select count(*) from public.win_records
        where verification_status = 'published' and verified_at is not null
          and published_at is not null and consent_to_publish = true and is_sample = false
      ),
      'privateStorageBytes', (
        select coalesce(sum(nullif(metadata ->> 'size', '')::bigint), 0)
        from storage.objects where bucket_id in ('analysis-screenshots', 'win-records')
      )
    ),
    'analysisSeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(day_value, 'YYYY-MM-DD'),
        'total', (select count(*) from public.analyses where created_at >= day_value and created_at < day_value + interval '1 day'),
        'completed', (select count(*) from public.analyses where status = 'completed' and created_at >= day_value and created_at < day_value + interval '1 day'),
        'failed', (select count(*) from public.analyses where status = 'failed' and created_at >= day_value and created_at < day_value + interval '1 day')
      ) order by day_value), '[]'::jsonb)
      from generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day') as day_value
    ),
    'userSeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(day_value, 'YYYY-MM-DD'),
        'count', (select count(*) from public.profiles where created_at >= day_value and created_at < day_value + interval '1 day')
      ) order by day_value), '[]'::jsonb)
      from generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day') as day_value
    ),
    'confidenceBands', (
      select coalesce(jsonb_agg(jsonb_build_object('band', band, 'count', count_value) order by band), '[]'::jsonb)
      from (
        select overall_confidence_band as band, count(*) as count_value
        from public.analyses
        where overall_confidence_band is not null and created_at >= p_from and created_at < p_to
        group by overall_confidence_band
      ) confidence_counts
    ),
    'moderationSeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(day_value, 'YYYY-MM-DD'),
        'reviews', (select count(*) from public.reviews where created_at >= day_value and created_at < day_value + interval '1 day'),
        'wins', (select count(*) from public.win_records where created_at >= day_value and created_at < day_value + interval '1 day')
      ) order by day_value), '[]'::jsonb)
      from generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day') as day_value
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_metrics(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard_metrics(timestamptz, timestamptz) to authenticated;

create or replace function public.admin_public_metric_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'registeredUsers', (select count(*) from public.profiles where deleted_at is null),
    'completedRealAnalyses', (select count(*) from public.analyses where status = 'completed' and provider <> 'deterministic-demo'),
    'verifiedPublishedWins', (
      select count(*) from public.win_records
      where verification_status = 'published' and verified_at is not null
        and published_at is not null and consent_to_publish = true and is_sample = false
    ),
    'verifiedAmountsByCurrency', (
      select coalesce(jsonb_object_agg(currency, amount_minor_sum), '{}'::jsonb)
      from (
        select currency, sum(amount_minor) as amount_minor_sum
        from public.win_records
        where verification_status = 'published' and verified_at is not null
          and published_at is not null and consent_to_publish = true and is_sample = false
        group by currency
      ) totals
    ),
    'approvedReviewCount', (
      select count(*) from public.reviews
      where moderation_status = 'approved' and published_at is not null and is_sample = false
    )
  );
end;
$$;

revoke all on function public.admin_public_metric_snapshot() from public, anon;
grant execute on function public.admin_public_metric_snapshot() to authenticated;

create or replace function public.admin_storage_growth(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  date_utc date,
  bucket text,
  file_count bigint,
  size_bytes numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > interval '366 days' then
    raise exception 'invalid reporting range';
  end if;
  return query
  select
    date_trunc('day', objects.created_at at time zone 'UTC')::date,
    objects.bucket_id::text,
    count(*),
    coalesce(sum(nullif(objects.metadata ->> 'size', '')::numeric), 0)
  from storage.objects as objects
  where objects.bucket_id in ('analysis-screenshots', 'win-records')
    and objects.created_at >= p_from and objects.created_at < p_to
  group by 1, 2
  order by 1, 2;
end;
$$;

revoke all on function public.admin_storage_growth(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_storage_growth(timestamptz, timestamptz) to authenticated;

create or replace function public.touch_current_user_activity()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_active_at = now()
  where id = auth.uid()
    and (last_active_at is null or last_active_at < now() - interval '15 minutes');
$$;

revoke all on function public.touch_current_user_activity() from public, anon;
grant execute on function public.touch_current_user_activity() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['analyses', 'reviews', 'win_records', 'system_events']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
