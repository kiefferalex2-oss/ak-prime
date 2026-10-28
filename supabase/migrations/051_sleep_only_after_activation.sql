-- AK PRIME : le sommeil commence seulement APRÈS activation par le coach
-- et arrivée de la date de démarrage, heure de Paris.
create or replace function private.ak_sleep_entry_allowed(p_client uuid,p_date date)
returns boolean language sql stable security definer set search_path=''
as $f$
select exists(
 select 1 from public.clients c
 where c.id=p_client and c.auth_user_id=auth.uid()
   and c.archived_at is null and c.portal_access_enabled
   and c.status='active'
   and c.start_date is not null
   and c.start_date <= (now() at time zone 'Europe/Paris')::date
   and p_date >= c.start_date
   and p_date <= (now() at time zone 'Europe/Paris')::date
   and c.current_pole='Performance' and c.current_offer='P3'
);
$f$;
revoke all on function private.ak_sleep_entry_allowed(uuid,date) from public,anon;
grant execute on function private.ak_sleep_entry_allowed(uuid,date) to authenticated;
drop policy if exists sleep_diary_client_insert on public.client_sleep_diary;
create policy sleep_diary_client_insert on public.client_sleep_diary
for insert to authenticated
with check (private.ak_sleep_entry_allowed(client_id,sleep_date));
drop policy if exists sleep_diary_client_update on public.client_sleep_diary;
create policy sleep_diary_client_update on public.client_sleep_diary
for update to authenticated
using (private.ak_sleep_entry_allowed(client_id,sleep_date))
with check (private.ak_sleep_entry_allowed(client_id,sleep_date));
-- RLS is the primary barrier; trigger also blocks server-side writes lacking
-- an authorized, started, coach-activated client in non-service contexts.
create or replace function private.ak_sleep_guard_before_write()
returns trigger language plpgsql security definer set search_path=''
as $f$
begin
 if auth.role()='service_role' then return new; end if;
 if not private.ak_sleep_entry_allowed(new.client_id,new.sleep_date) then
  raise exception 'Agenda verrouillé : activation du coach et date de démarrage requises'
   using errcode='42501';
 end if;
 return new;
end;
$f$;
revoke all on function private.ak_sleep_guard_before_write() from public,anon,authenticated;
drop trigger if exists ak_sleep_activation_guard on public.client_sleep_diary;
create trigger ak_sleep_activation_guard before insert or update on public.client_sleep_diary
for each row execute function private.ak_sleep_guard_before_write();