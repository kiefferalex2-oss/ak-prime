-- AK PRIME / 028 — Échéances visibles dans le Passeport et cohérence des dates des cycles.
-- Appliquée dans Supabase. Projection publique limitée : pas de notes privées du coach.
create or replace function public.my_passport_assessment_dates()
returns table (
 id uuid,
 client_id uuid,
 phase text,
 due_date date,
 title text,
 status text,
 cycle_id uuid
)
language sql stable security definer
set search_path=pg_catalog,public,private
as $$
 select ap.id,ap.client_id,ap.phase,ap.due_date,ap.title,ap.status,ap.cycle_id
 from public.client_assessment_plans ap
 join public.clients cl on cl.id=ap.client_id
 where auth.uid() is not null
  and cl.auth_user_id=auth.uid()
  and cl.portal_access_enabled is true
  and cl.archived_at is null
  and ap.status in ('planned','completed')
 order by ap.due_date asc
 limit 500
$$;
revoke all on function public.my_passport_assessment_dates() from public,anon;
grant execute on function public.my_passport_assessment_dates() to authenticated;

create or replace function private.sync_pending_assessment_with_cycle()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
begin
 if new.end_date is not null and
    (new.end_date is distinct from old.end_date or new.title is distinct from old.title) then
   update public.client_assessment_plans ap
    set due_date=new.end_date,
        title='Bilan fin de cycle — '||left(new.title,100),
        updated_at=now()
   where ap.cycle_id=new.id
      and ap.phase='cycle_end'
      and ap.source='offer_schedule'
      and ap.status='planned';
 end if;
 return new;
end;
$$;
drop trigger if exists sync_cycle_end_assessment_plan on public.cycles;
create trigger sync_cycle_end_assessment_plan after update of title,end_date on public.cycles
for each row execute function private.sync_pending_assessment_with_cycle();