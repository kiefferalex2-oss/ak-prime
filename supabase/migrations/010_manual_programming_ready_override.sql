-- AK PRIME — passage manuel en prêt pour programmation

alter table public.onboarding
  add column if not exists tests_waived boolean not null default false,
  add column if not exists tests_waived_at timestamptz;

create or replace function public.refresh_onboarding_internal(target_client uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q_submitted_at timestamptz;
  ob public.onboarding%rowtype;
  req_count integer := 0;
  missing_count integer := 0;
  all_tests_done boolean := false;
  next_step text;
begin
  insert into public.onboarding(client_id, current_step)
  values (target_client, 'questionnaire')
  on conflict (client_id) do nothing;

  select * into ob
  from public.onboarding
  where client_id = target_client;

  select max(submitted_at)
  into q_submitted_at
  from public.questionnaire_responses
  where client_id = target_client
    and status = 'submitted';

  req_count := coalesce(jsonb_array_length(coalesce(ob.tests_required, '[]'::jsonb)), 0);

  if ob.tests_waived then
    all_tests_done := true;
  elsif req_count > 0 then
    select count(*)
    into missing_count
    from jsonb_array_elements_text(coalesce(ob.tests_required, '[]'::jsonb)) req(test_name)
    where not exists (
      select 1
      from public.tests t
      where t.client_id = target_client
        and lower(regexp_replace(trim(t.test_name), '[^a-zA-Z0-9À-ÿ]+', '', 'g'))
          = lower(regexp_replace(trim(req.test_name), '[^a-zA-Z0-9À-ÿ]+', '', 'g'))
    );
    all_tests_done := (missing_count = 0);
  end if;

  next_step := case
    when ob.onboarding_completed_at is not null then 'active'
    when q_submitted_at is null then 'questionnaire'
    when ob.visio_completed_at is null then 'visio'
    when not all_tests_done then 'tests'
    else 'programming'
  end;

  update public.onboarding
  set questionnaire_received_at = q_submitted_at,
      tests_completed_at = case when all_tests_done then coalesce(tests_completed_at, now()) else null end,
      programming_ready_at = case when all_tests_done then coalesce(programming_ready_at, now()) else null end,
      current_step = next_step,
      updated_at = now()
  where client_id = target_client;
end;
$$;

revoke execute on function public.refresh_onboarding_internal(uuid) from public, anon, authenticated;
