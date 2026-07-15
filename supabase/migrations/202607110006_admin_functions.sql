create or replace function public.insert_admin_audit(
  p_action text,
  p_target_entity_type text,
  p_target_entity_id text,
  p_previous_value jsonb,
  p_new_value jsonb,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_id uuid;
begin
  select role into v_actor_role from public.profiles where id = v_actor_id;
  if v_actor_role not in ('admin', 'super_admin') then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'an administrative reason is required';
  end if;

  insert into public.admin_audit_logs (
    administrator_id,
    administrator_role,
    action,
    target_entity_type,
    target_entity_id,
    previous_value_redacted,
    new_value_redacted,
    reason,
    request_metadata,
    ip_address,
    user_agent
  ) values (
    v_actor_id,
    v_actor_role,
    p_action,
    p_target_entity_type,
    p_target_entity_id,
    public.redact_admin_json(p_previous_value),
    public.redact_admin_json(p_new_value),
    trim(p_reason),
    coalesce(p_request_metadata, '{}'::jsonb) - 'authorization' - 'cookie',
    case
      when coalesce(p_request_metadata ->> 'ip_address', '') ~ '^[0-9a-fA-F:.]+$'
        then (p_request_metadata ->> 'ip_address')::inet
      else null
    end,
    left(nullif(p_request_metadata ->> 'user_agent', ''), 500)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.insert_admin_audit(
  text, text, text, jsonb, jsonb, text, jsonb
) from public, anon, authenticated;

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

  if v_before.role in ('admin', 'super_admin') and v_actor_role <> 'super_admin' then
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
      if p_value not in ('user', 'admin', 'super_admin') then
        raise exception 'invalid role';
      end if;
      update public.profiles
      set role = p_value, role_updated_at = now(), role_updated_by = v_actor_id,
          updated_at = now()
      where id = p_target_id;
    when 'request_anonymization' then
      insert into public.privacy_requests (
        user_id, request_type, reason, requested_by
      ) values (p_target_id, 'anonymization', trim(p_reason), v_actor_id);
      update public.profiles set account_status = 'deletion_pending', updated_at = now()
      where id = p_target_id;
    when 'request_deletion' then
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
    'user.' || p_operation,
    'user',
    p_target_id::text,
    to_jsonb(v_before),
    to_jsonb(v_after),
    p_reason,
    p_request_metadata
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

create or replace function public.admin_add_note(
  p_target_type text,
  p_target_id uuid,
  p_body text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if p_target_type not in ('user', 'analysis', 'win_record', 'review') then
    raise exception 'invalid note target';
  end if;
  if char_length(trim(coalesce(p_body, ''))) < 2 then raise exception 'note is required'; end if;

  insert into public.admin_notes (target_entity_type, target_entity_id, body, created_by)
  values (p_target_type, p_target_id, trim(p_body), auth.uid())
  returning id into v_id;

  perform public.insert_admin_audit(
    p_target_type || '.note_added', p_target_type, p_target_id::text,
    null, jsonb_build_object('note_id', v_id), 'Private administrator note added',
    p_request_metadata
  );
  return v_id;
end;
$$;

revoke all on function public.admin_add_note(text, uuid, text, jsonb) from public, anon;
grant execute on function public.admin_add_note(text, uuid, text, jsonb) to authenticated;

create or replace function public.admin_moderate_review(
  p_review_id uuid,
  p_operation text,
  p_reason text,
  p_redacted_body text default null,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.reviews%rowtype;
  v_after public.reviews%rowtype;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_before from public.reviews where id = p_review_id for update;
  if not found then raise exception 'review not found'; end if;

  case p_operation
    when 'approve' then
      update public.reviews set moderation_status = 'approved', published_at = now(),
        moderator_id = auth.uid(), moderation_reason = trim(p_reason)
      where id = p_review_id;
    when 'reject' then
      update public.reviews set moderation_status = 'rejected', published_at = null,
        moderator_id = auth.uid(), moderation_reason = trim(p_reason)
      where id = p_review_id;
    when 'hide' then
      update public.reviews set moderation_status = 'hidden', published_at = null,
        moderator_id = auth.uid(), moderation_reason = trim(p_reason)
      where id = p_review_id;
    when 'restore' then
      update public.reviews set moderation_status = 'approved', published_at = now(),
        moderator_id = auth.uid(), moderation_reason = trim(p_reason)
      where id = p_review_id;
    when 'redact' then
      if char_length(trim(coalesce(p_redacted_body, ''))) < 2 then
        raise exception 'a redacted review body is required';
      end if;
      update public.reviews set redacted_body = trim(p_redacted_body),
        moderator_id = auth.uid(), moderation_reason = trim(p_reason)
      where id = p_review_id;
    else
      raise exception 'unsupported review operation';
  end case;

  select * into v_after from public.reviews where id = p_review_id;
  insert into public.moderation_actions (
    entity_type, entity_id, action, previous_status, new_status, reason, moderator_id
  ) values (
    'review', p_review_id, p_operation, v_before.moderation_status,
    v_after.moderation_status, trim(p_reason), auth.uid()
  );
  perform public.insert_admin_audit(
    'review.' || p_operation, 'review', p_review_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason, p_request_metadata
  );
  return public.redact_admin_json(to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_moderate_review(
  uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.admin_moderate_review(
  uuid, text, text, text, jsonb
) to authenticated;

create or replace function public.admin_moderate_win_record(
  p_record_id uuid,
  p_operation text,
  p_reason text,
  p_value text default null,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.win_records%rowtype;
  v_after public.win_records%rowtype;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_before from public.win_records where id = p_record_id for update;
  if not found then raise exception 'win record not found'; end if;

  case p_operation
    when 'begin_review' then
      update public.win_records set verification_status = 'under_review',
        moderator_id = auth.uid(), moderator_notes = trim(p_reason)
      where id = p_record_id;
    when 'verify' then
      update public.win_records set verification_status = 'verified', verified_at = now(),
        published_at = null, moderator_id = auth.uid(), moderator_notes = trim(p_reason),
        rejection_reason = null
      where id = p_record_id;
    when 'reject' then
      update public.win_records set verification_status = 'rejected', verified_at = null,
        published_at = null, moderator_id = auth.uid(), rejection_reason = trim(p_reason),
        moderator_notes = trim(p_reason)
      where id = p_record_id;
    when 'request_evidence' then
      update public.win_records set verification_status = 'under_review',
        requested_more_evidence_at = now(), moderator_id = auth.uid(),
        moderator_notes = trim(p_reason)
      where id = p_record_id;
    when 'publish' then
      if v_before.verification_status not in ('verified', 'unpublished')
        or v_before.verified_at is null then
        raise exception 'record must be verified before publication';
      end if;
      if v_before.consent_to_publish is not true or v_before.consent_recorded_at is null then
        raise exception 'recorded user consent is required before publication';
      end if;
      update public.win_records set verification_status = 'published', published_at = now(),
        moderator_id = auth.uid(), moderator_notes = trim(p_reason)
      where id = p_record_id;
    when 'unpublish' then
      update public.win_records set verification_status = 'unpublished', published_at = null,
        moderator_id = auth.uid(), moderator_notes = trim(p_reason)
      where id = p_record_id;
    when 'revoke' then
      update public.win_records set verification_status = 'under_review', verified_at = null,
        published_at = null, moderator_id = auth.uid(), moderator_notes = trim(p_reason)
      where id = p_record_id;
    when 'redact' then
      if char_length(trim(coalesce(p_value, ''))) < 2 then
        raise exception 'a privacy-safe public name is required';
      end if;
      update public.win_records set privacy_safe_public_name = left(trim(p_value), 40),
        moderator_id = auth.uid(), moderator_notes = trim(p_reason)
      where id = p_record_id;
    else
      raise exception 'unsupported win-record operation';
  end case;

  select * into v_after from public.win_records where id = p_record_id;
  insert into public.moderation_actions (
    entity_type, entity_id, action, previous_status, new_status, reason, moderator_id
  ) values (
    'win_record', p_record_id, p_operation, v_before.verification_status,
    v_after.verification_status, trim(p_reason), auth.uid()
  );
  perform public.insert_admin_audit(
    'win_record.' || p_operation, 'win_record', p_record_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason, p_request_metadata
  );
  return public.redact_admin_json(to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_moderate_win_record(
  uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.admin_moderate_win_record(
  uuid, text, text, text, jsonb
) to authenticated;

create or replace function public.admin_queue_analysis_retry(
  p_analysis_id uuid,
  p_use_active_configuration boolean,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_analysis public.analyses%rowtype;
  v_job_id uuid;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_analysis from public.analyses where id = p_analysis_id for update;
  if not found then raise exception 'analysis not found'; end if;
  if v_analysis.status = 'processing' then raise exception 'analysis is already processing'; end if;

  begin
    insert into public.analysis_retry_jobs (
      analysis_id, requested_by, use_active_configuration, reason
    ) values (
      p_analysis_id, auth.uid(), p_use_active_configuration, trim(p_reason)
    ) returning id into v_job_id;
  exception when unique_violation then
    raise exception 'an active retry already exists for this analysis';
  end;

  perform public.insert_admin_audit(
    'analysis.retry_queued', 'analysis', p_analysis_id::text,
    jsonb_build_object('status', v_analysis.status),
    jsonb_build_object('retry_job_id', v_job_id, 'use_active_configuration', p_use_active_configuration),
    p_reason, p_request_metadata
  );
  return v_job_id;
end;
$$;

revoke all on function public.admin_queue_analysis_retry(
  uuid, boolean, text, jsonb
) from public, anon;
grant execute on function public.admin_queue_analysis_retry(
  uuid, boolean, text, jsonb
) to authenticated;

create or replace function public.complete_analysis_retry_job(
  p_job_id uuid,
  p_provider text,
  p_model_identifier text,
  p_configuration_version_id uuid,
  p_result jsonb,
  p_processing_duration_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.analysis_retry_jobs%rowtype;
  v_actor_role text;
begin
  select * into v_job from public.analysis_retry_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'processing' then raise exception 'retry job is not processing'; end if;
  select role into v_actor_role from public.profiles where id = v_job.requested_by;
  update public.analysis_retry_jobs
  set status = 'completed', completed_at = now(), provider = p_provider,
      model_identifier = p_model_identifier,
      configuration_version_id = p_configuration_version_id,
      result = p_result, original_provider_response = p_result,
      processing_duration_ms = greatest(0, p_processing_duration_ms)
  where id = p_job_id;
  insert into public.admin_audit_logs (
    administrator_id, administrator_role, action, target_entity_type,
    target_entity_id, previous_value_redacted, new_value_redacted, reason
  ) values (
    v_job.requested_by,
    case when v_actor_role in ('admin', 'super_admin') then v_actor_role else 'system' end,
    'analysis.retry_completed',
    'analysis', v_job.analysis_id::text,
    jsonb_build_object('retry_job_id', p_job_id, 'status', 'processing'),
    jsonb_build_object('retry_job_id', p_job_id, 'status', 'completed', 'provider', p_provider, 'model_identifier', p_model_identifier),
    v_job.reason
  );
end;
$$;

revoke all on function public.complete_analysis_retry_job(uuid, text, text, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.complete_analysis_retry_job(uuid, text, text, uuid, jsonb, integer) to service_role;

create or replace function public.fail_analysis_retry_job(
  p_job_id uuid,
  p_error_message_redacted text,
  p_processing_duration_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.analysis_retry_jobs%rowtype;
  v_actor_role text;
begin
  select * into v_job from public.analysis_retry_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'processing' then raise exception 'retry job is not processing'; end if;
  select role into v_actor_role from public.profiles where id = v_job.requested_by;
  update public.analysis_retry_jobs
  set status = 'failed', completed_at = now(),
      error_message_redacted = left(p_error_message_redacted, 1000),
      processing_duration_ms = greatest(0, p_processing_duration_ms)
  where id = p_job_id;
  insert into public.admin_audit_logs (
    administrator_id, administrator_role, action, target_entity_type,
    target_entity_id, previous_value_redacted, new_value_redacted, reason
  ) values (
    v_job.requested_by,
    case when v_actor_role in ('admin', 'super_admin') then v_actor_role else 'system' end,
    'analysis.retry_failed',
    'analysis', v_job.analysis_id::text,
    jsonb_build_object('retry_job_id', p_job_id, 'status', 'processing'),
    jsonb_build_object('retry_job_id', p_job_id, 'status', 'failed'),
    v_job.reason
  );
end;
$$;

revoke all on function public.fail_analysis_retry_job(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.fail_analysis_retry_job(uuid, text, integer) to service_role;

create or replace function public.admin_review_analysis(
  p_analysis_id uuid,
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
  v_before public.analyses%rowtype;
  v_after public.analyses%rowtype;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_before from public.analyses where id = p_analysis_id for update;
  if not found then raise exception 'analysis not found'; end if;

  v_status := case p_operation
    when 'flag' then 'flagged'
    when 'confirm' then 'confirmed'
    when 'false_positive' then 'false_positive'
    when 'parsing_error' then 'parsing_error'
    else null
  end;
  if v_status is null then raise exception 'unsupported analysis review operation'; end if;

  update public.analyses set admin_review_status = v_status where id = p_analysis_id;
  insert into public.admin_notes (target_entity_type, target_entity_id, body, created_by)
  values ('analysis', p_analysis_id, trim(p_reason), auth.uid());
  select * into v_after from public.analyses where id = p_analysis_id;
  perform public.insert_admin_audit(
    'analysis.' || p_operation, 'analysis', p_analysis_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason, p_request_metadata
  );
  return public.redact_admin_json(to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_review_analysis(
  uuid, text, text, jsonb
) from public, anon;
grant execute on function public.admin_review_analysis(
  uuid, text, text, jsonb
) to authenticated;

create or replace function public.admin_correct_analysis(
  p_analysis_id uuid,
  p_correction jsonb,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.analyses%rowtype;
  v_after public.analyses%rowtype;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  if p_correction is null or jsonb_typeof(p_correction) <> 'object' then
    raise exception 'correction must be a JSON object';
  end if;
  select * into v_before from public.analyses where id = p_analysis_id for update;
  if not found then raise exception 'analysis not found'; end if;

  update public.analyses
  set admin_correction = p_correction,
      correction_reason = trim(p_reason),
      corrected_by = auth.uid(),
      corrected_at = now()
  where id = p_analysis_id;
  select * into v_after from public.analyses where id = p_analysis_id;
  perform public.insert_admin_audit(
    'analysis.correction_added', 'analysis', p_analysis_id::text,
    jsonb_build_object('existing_correction', v_before.admin_correction),
    jsonb_build_object('correction', p_correction, 'original_result_preserved', true),
    p_reason, p_request_metadata
  );
  return public.redact_admin_json(to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_correct_analysis(uuid, jsonb, text, jsonb) from public, anon;
grant execute on function public.admin_correct_analysis(uuid, jsonb, text, jsonb) to authenticated;

create or replace function public.admin_remove_analysis_image(
  p_analysis_id uuid,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select private_image_path into v_path
  from public.analyses where id = p_analysis_id for update;
  if not found then raise exception 'analysis not found'; end if;
  if v_path is null then raise exception 'analysis image was already removed'; end if;

  update public.analyses
  set private_image_path = null,
      upload_metadata = upload_metadata || jsonb_build_object(
        'image_removed_at', now(), 'image_removed_by', auth.uid()
      )
  where id = p_analysis_id;
  perform public.insert_admin_audit(
    'analysis.image_removed', 'analysis', p_analysis_id::text,
    jsonb_build_object('had_private_image', true),
    jsonb_build_object('had_private_image', false),
    p_reason, p_request_metadata
  );
  return v_path;
end;
$$;

revoke all on function public.admin_remove_analysis_image(uuid, text, jsonb) from public, anon;
grant execute on function public.admin_remove_analysis_image(uuid, text, jsonb) to authenticated;

create or replace function public.admin_mark_stale_analysis_failed(
  p_analysis_id uuid,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.analyses%rowtype;
  v_after public.analyses%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_before from public.analyses where id = p_analysis_id for update;
  if not found then raise exception 'analysis not found'; end if;
  if v_before.status <> 'processing'
    or v_before.processing_started_at is null
    or v_before.processing_started_at > now() - interval '10 minutes' then
    raise exception 'analysis is not a stale processing job';
  end if;

  update public.analyses
  set status = 'failed', processing_completed_at = now(),
      processing_duration_ms = greatest(0, extract(epoch from (now() - processing_started_at)) * 1000)::integer,
      error_code = 'STALE_PROCESSING_JOB',
      error_message_redacted = 'Marked failed by an authorized administrator after exceeding the processing window.'
  where id = p_analysis_id;
  select * into v_after from public.analyses where id = p_analysis_id;
  perform public.insert_admin_audit(
    'analysis.stale_marked_failed', 'analysis', p_analysis_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason, p_request_metadata
  );
  return public.redact_admin_json(to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_mark_stale_analysis_failed(uuid, text, jsonb) from public, anon;
grant execute on function public.admin_mark_stale_analysis_failed(uuid, text, jsonb) to authenticated;

create or replace function public.admin_save_content_version(
  p_content_key text,
  p_content jsonb,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version integer;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if p_content_key !~ '^[a-z0-9_.-]{2,80}$' then raise exception 'invalid content key'; end if;
  if jsonb_typeof(p_content) <> 'object' then raise exception 'content must be a JSON object'; end if;
  if p_content::text ~* '\m(hack|crack|bypass)\M' then
    raise exception 'public content contains prohibited access claims';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;

  select coalesce(max(version_number), 0) + 1 into v_version
  from public.content_versions where content_key = p_content_key;
  insert into public.content_versions (
    content_key, version_number, content, status, change_reason, created_by
  ) values (
    p_content_key, v_version, p_content, 'draft', trim(p_reason), auth.uid()
  ) returning id into v_id;
  perform public.insert_admin_audit(
    'content.draft_created', 'content_version', v_id::text, null,
    jsonb_build_object('content_key', p_content_key, 'version_number', v_version),
    p_reason, p_request_metadata
  );
  return v_id;
end;
$$;

revoke all on function public.admin_save_content_version(
  text, jsonb, text, jsonb
) from public, anon;
grant execute on function public.admin_save_content_version(
  text, jsonb, text, jsonb
) to authenticated;

create or replace function public.admin_publish_content_version(
  p_version_id uuid,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.content_versions%rowtype;
  v_previous jsonb;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_target from public.content_versions where id = p_version_id for update;
  if not found then raise exception 'content version not found'; end if;

  select to_jsonb(content_versions) into v_previous
  from public.content_versions
  where content_key = v_target.content_key and status = 'published'
  limit 1;
  update public.content_versions set status = 'archived'
  where content_key = v_target.content_key and status = 'published';
  update public.content_versions
  set status = 'published', published_by = auth.uid(), published_at = now()
  where id = p_version_id;
  perform public.insert_admin_audit(
    'content.published', 'content_version', p_version_id::text, v_previous,
    jsonb_build_object('content_key', v_target.content_key, 'version_number', v_target.version_number),
    p_reason, p_request_metadata
  );
end;
$$;

revoke all on function public.admin_publish_content_version(
  uuid, text, jsonb
) from public, anon;
grant execute on function public.admin_publish_content_version(
  uuid, text, jsonb
) to authenticated;

create or replace function public.admin_save_ai_config(
  p_config jsonb,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version integer;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select coalesce(max(version_number), 0) + 1 into v_version from public.ai_config_versions;
  insert into public.ai_config_versions (
    version_number, provider_name, model_identifier, prompt_template_version,
    extraction_instructions, analysis_instructions, confidence_thresholds,
    risk_thresholds, maximum_screenshot_bytes, accepted_mime_types,
    maximum_matches, analysis_timeout_ms, retry_limit, per_user_daily_limit,
    feature_flags, configuration_notes, created_by
  ) values (
    v_version,
    p_config ->> 'provider_name',
    p_config ->> 'model_identifier',
    p_config ->> 'prompt_template_version',
    p_config ->> 'extraction_instructions',
    p_config ->> 'analysis_instructions',
    coalesce(p_config -> 'confidence_thresholds', '{"low":0.45,"medium":0.6,"high":0.75}'::jsonb),
    coalesce(p_config -> 'risk_thresholds', '{"low":0.7,"medium":0.55,"high":0}'::jsonb),
    coalesce((p_config ->> 'maximum_screenshot_bytes')::integer, 10485760),
    coalesce(array(select jsonb_array_elements_text(p_config -> 'accepted_mime_types')), array['image/jpeg','image/png','image/webp']),
    coalesce((p_config ->> 'maximum_matches')::integer, 20),
    coalesce((p_config ->> 'analysis_timeout_ms')::integer, 45000),
    coalesce((p_config ->> 'retry_limit')::integer, 2),
    coalesce((p_config ->> 'per_user_daily_limit')::integer, 20),
    coalesce(p_config -> 'feature_flags', '{}'::jsonb),
    p_config ->> 'configuration_notes',
    auth.uid()
  ) returning id into v_id;
  perform public.insert_admin_audit(
    'ai_config.draft_created', 'ai_config_version', v_id::text, null,
    jsonb_build_object('version_number', v_version, 'provider_name', p_config ->> 'provider_name', 'model_identifier', p_config ->> 'model_identifier'),
    p_reason, p_request_metadata
  );
  return v_id;
end;
$$;

revoke all on function public.admin_save_ai_config(jsonb, text, jsonb) from public, anon;
grant execute on function public.admin_save_ai_config(jsonb, text, jsonb) to authenticated;

create or replace function public.admin_activate_ai_config(
  p_config_id uuid,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.ai_config_versions%rowtype;
  v_previous jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select * into v_target from public.ai_config_versions where id = p_config_id for update;
  if not found then raise exception 'AI configuration not found'; end if;
  select to_jsonb(ai_config_versions) into v_previous
  from public.ai_config_versions where status = 'active' limit 1;
  update public.ai_config_versions set status = 'archived' where status = 'active';
  update public.ai_config_versions
  set status = 'active', activated_by = auth.uid(), activated_at = now()
  where id = p_config_id;
  perform public.insert_admin_audit(
    'ai_config.activated', 'ai_config_version', p_config_id::text,
    v_previous,
    jsonb_build_object('version_number', v_target.version_number, 'provider_name', v_target.provider_name, 'model_identifier', v_target.model_identifier),
    p_reason, p_request_metadata
  );
end;
$$;

revoke all on function public.admin_activate_ai_config(
  uuid, text, jsonb
) from public, anon;
grant execute on function public.admin_activate_ai_config(
  uuid, text, jsonb
) to authenticated;

create or replace function public.admin_upsert_setting(
  p_key text,
  p_category text,
  p_value jsonb,
  p_is_sensitive boolean,
  p_description text,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if p_is_sensitive and not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if p_category not in ('general', 'safety', 'privacy', 'limits', 'features', 'security') then
    raise exception 'invalid setting category';
  end if;
  if p_key !~ '^[a-z0-9_.-]{2,100}$' then raise exception 'invalid setting key'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select to_jsonb(site_settings) into v_before from public.site_settings where key = p_key;
  insert into public.site_settings (
    key, category, value, is_sensitive, description, updated_by, updated_at
  ) values (
    p_key, p_category, p_value, p_is_sensitive, coalesce(p_description, ''), auth.uid(), now()
  ) on conflict (key) do update set
    category = excluded.category,
    value = excluded.value,
    is_sensitive = excluded.is_sensitive,
    description = excluded.description,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
  perform public.insert_admin_audit(
    'setting.updated', 'site_setting', p_key, v_before,
    jsonb_build_object('key', p_key, 'category', p_category, 'is_sensitive', p_is_sensitive),
    p_reason, p_request_metadata
  );
end;
$$;

revoke all on function public.admin_upsert_setting(
  text, text, jsonb, boolean, text, text, jsonb
) from public, anon;
grant execute on function public.admin_upsert_setting(
  text, text, jsonb, boolean, text, text, jsonb
) to authenticated;

create or replace function public.admin_update_feature_flag(
  p_key text,
  p_enabled boolean,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason is required'; end if;
  select to_jsonb(feature_flags) into v_before from public.feature_flags where key = p_key for update;
  if v_before is null then raise exception 'feature flag not found'; end if;
  update public.feature_flags
  set enabled = p_enabled, updated_by = auth.uid(), updated_at = now()
  where key = p_key;
  perform public.insert_admin_audit(
    'feature_flag.updated', 'feature_flag', p_key, v_before,
    jsonb_build_object('key', p_key, 'enabled', p_enabled),
    p_reason, p_request_metadata
  );
end;
$$;

revoke all on function public.admin_update_feature_flag(text, boolean, text, jsonb) from public, anon;
grant execute on function public.admin_update_feature_flag(text, boolean, text, jsonb) to authenticated;

create or replace function public.admin_record_export(
  p_report_type text,
  p_reason text,
  p_request_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  return public.insert_admin_audit(
    'report.exported', 'report', p_report_type, null,
    jsonb_build_object('report_type', p_report_type), p_reason, p_request_metadata
  );
end;
$$;

revoke all on function public.admin_record_export(text, text, jsonb) from public, anon;
grant execute on function public.admin_record_export(text, text, jsonb) to authenticated;
