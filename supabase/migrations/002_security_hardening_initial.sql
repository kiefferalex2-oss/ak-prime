-- AK PRIME — durcissement sécurité initial
alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_coach() from public, anon;
revoke execute on function public.can_access_client(uuid) from public, anon;

grant execute on function public.is_coach() to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_coach());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients
for select to authenticated
using (public.can_access_client(id));

drop policy if exists clients_coach_insert on public.clients;
create policy clients_coach_insert on public.clients
for insert to authenticated
with check (public.is_coach());

drop policy if exists clients_coach_update on public.clients;
create policy clients_coach_update on public.clients
for update to authenticated
using (public.is_coach())
with check (public.is_coach());

drop policy if exists assignments_coach_all on public.coach_client_assignments;
create policy assignments_coach_all on public.coach_client_assignments
for all to authenticated
using (public.is_coach())
with check (public.is_coach());

revoke all on table
  public.profiles, public.clients, public.coach_client_assignments, public.enrollments,
  public.onboarding, public.questionnaire_responses, public.visio_notes,
  public.client_preferences, public.tests, public.cycles, public.checkins,
  public.passport_events, public.coach_notes, public.appointments
from anon;

grant select, insert, update, delete on table
  public.profiles, public.clients, public.coach_client_assignments, public.enrollments,
  public.onboarding, public.questionnaire_responses, public.visio_notes,
  public.client_preferences, public.tests, public.cycles, public.checkins,
  public.passport_events, public.coach_notes, public.appointments
to authenticated, service_role;

create index if not exists client_preferences_client_idx on public.client_preferences(client_id);
create index if not exists coach_notes_client_idx on public.coach_notes(client_id);
create index if not exists coach_notes_created_by_idx on public.coach_notes(created_by);
create index if not exists cycles_created_by_idx on public.cycles(created_by);
create index if not exists enrollments_client_idx on public.enrollments(client_id);
create index if not exists tests_created_by_idx on public.tests(created_by);
create index if not exists visio_notes_client_idx on public.visio_notes(client_id);
create index if not exists visio_notes_created_by_idx on public.visio_notes(created_by);
create index if not exists visio_notes_questionnaire_idx on public.visio_notes(questionnaire_response_id);
