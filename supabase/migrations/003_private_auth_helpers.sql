-- AK PRIME — helpers d'autorisation privés et verrouillage du rôle utilisateur
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','coach')
  );
$$;

create or replace function private.can_access_client(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    exists (select 1 from public.clients where id = target_client and auth_user_id = auth.uid())
    or exists (
      select 1 from public.coach_client_assignments
      where client_id = target_client and coach_user_id = auth.uid() and active = true
    )
    or private.is_coach();
$$;

revoke execute on function private.is_coach() from public, anon;
revoke execute on function private.can_access_client(uuid) from public, anon;
grant execute on function private.is_coach() to authenticated, service_role;
grant execute on function private.can_access_client(uuid) to authenticated, service_role;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
for select to authenticated
using (id = (select auth.uid()) or private.is_coach());

drop policy if exists profiles_self_update on public.profiles;
revoke update on public.profiles from authenticated;
grant update(full_name) on public.profiles to authenticated;

drop policy if exists profiles_name_update on public.profiles;
create policy profiles_name_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients for select to authenticated using (private.can_access_client(id));
drop policy if exists clients_coach_insert on public.clients;
create policy clients_coach_insert on public.clients for insert to authenticated with check (private.is_coach());
drop policy if exists clients_coach_update on public.clients;
create policy clients_coach_update on public.clients for update to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists assignments_coach_all on public.coach_client_assignments;
create policy assignments_coach_all on public.coach_client_assignments for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists enrollments_read on public.enrollments;
create policy enrollments_read on public.enrollments for select to authenticated using (private.can_access_client(client_id));
drop policy if exists enrollments_write on public.enrollments;
create policy enrollments_write on public.enrollments for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists onboarding_read on public.onboarding;
create policy onboarding_read on public.onboarding for select to authenticated using (private.can_access_client(client_id));
drop policy if exists onboarding_write on public.onboarding;
create policy onboarding_write on public.onboarding for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists questionnaire_read on public.questionnaire_responses;
create policy questionnaire_read on public.questionnaire_responses for select to authenticated using (private.can_access_client(client_id));
drop policy if exists questionnaire_client_insert on public.questionnaire_responses;
create policy questionnaire_client_insert on public.questionnaire_responses for insert to authenticated with check (private.can_access_client(client_id));
drop policy if exists questionnaire_coach_update on public.questionnaire_responses;
create policy questionnaire_coach_update on public.questionnaire_responses for update to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists visio_notes_coach_all on public.visio_notes;
create policy visio_notes_coach_all on public.visio_notes for all to authenticated using (private.is_coach()) with check (private.is_coach());
drop policy if exists visio_notes_client_read on public.visio_notes;
create policy visio_notes_client_read on public.visio_notes for select to authenticated using (visibility='client_visible' and private.can_access_client(client_id));

drop policy if exists preferences_read on public.client_preferences;
create policy preferences_read on public.client_preferences for select to authenticated using (private.can_access_client(client_id));
drop policy if exists preferences_write on public.client_preferences;
create policy preferences_write on public.client_preferences for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists tests_read on public.tests;
create policy tests_read on public.tests for select to authenticated using (private.can_access_client(client_id));
drop policy if exists tests_write on public.tests;
create policy tests_write on public.tests for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists cycles_read on public.cycles;
create policy cycles_read on public.cycles for select to authenticated using (private.can_access_client(client_id));
drop policy if exists cycles_write on public.cycles;
create policy cycles_write on public.cycles for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins for select to authenticated using (private.can_access_client(client_id));
drop policy if exists checkins_client_insert on public.checkins;
create policy checkins_client_insert on public.checkins for insert to authenticated with check (private.can_access_client(client_id));
drop policy if exists checkins_coach_update on public.checkins;
create policy checkins_coach_update on public.checkins for update to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists passport_events_read on public.passport_events;
create policy passport_events_read on public.passport_events for select to authenticated using (private.is_coach() or (client_visible and private.can_access_client(client_id)));
drop policy if exists passport_events_write on public.passport_events;
create policy passport_events_write on public.passport_events for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists coach_notes_all on public.coach_notes;
create policy coach_notes_all on public.coach_notes for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop policy if exists appointments_read on public.appointments;
create policy appointments_read on public.appointments for select to authenticated using (private.can_access_client(client_id));
drop policy if exists appointments_write on public.appointments;
create policy appointments_write on public.appointments for all to authenticated using (private.is_coach()) with check (private.is_coach());

drop function if exists public.can_access_client(uuid);
drop function if exists public.is_coach();
