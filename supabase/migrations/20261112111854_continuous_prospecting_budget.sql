alter table public.prospection_settings
 add column if not exists research_monthly_budget_cents integer not null default 1000 check(research_monthly_budget_cents between 0 and 100000),
 add column if not exists last_research_at timestamptz,
 add column if not exists research_sequence integer not null default 0,
 add column if not exists research_note text not null default 'Recherche non démarrée.',
 add column if not exists current_phase text not null default 'waiting',
 add column if not exists next_research_at timestamptz,
 add column if not exists month_reserved_cents integer not null default 0;

create table if not exists public.prospection_research_reservations (
 id uuid primary key default gen_random_uuid(),
 reserved_at timestamptz not null default now(),
 reserved_cents integer not null default 10 check(reserved_cents=10)
);
create table if not exists public.prospection_runs (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(), finished_at timestamptz,
 mode text not null, phase text not null default 'starting',
 checked integer not null default 0, candidates integer not null default 0,
 added integer not null default 0, verified integer not null default 0,
 sent integer not null default 0, note text not null default ''
);
alter table public.prospection_leads
 add column if not exists proposed_email text,
 add column if not exists verification_attempts integer not null default 0,
 add column if not exists verification_note text not null default '',
 add column if not exists next_verification_at timestamptz;
alter table public.prospection_research_reservations enable row level security;
alter table public.prospection_runs enable row level security;
revoke all on public.prospection_research_reservations,public.prospection_runs from public,anon,authenticated;
grant select on public.prospection_research_reservations,public.prospection_runs to authenticated;
grant all on public.prospection_research_reservations,public.prospection_runs to service_role;
drop policy if exists research_budget_owner_read on public.prospection_research_reservations;
create policy research_budget_owner_read on public.prospection_research_reservations for select to authenticated
 using((select private.is_prospection_owner()));
drop policy if exists research_runs_owner_read on public.prospection_runs;
create policy research_runs_owner_read on public.prospection_runs for select to authenticated
 using((select private.is_prospection_owner()));

-- A reservation is a conservative upper-bound allowance, never a claim about
-- the provider's actual invoice. No refunds/retries on failed calls.
create or replace function public.prospection_reserve_research(p_day date)
returns boolean language plpgsql security invoker set search_path='' as $$
declare cfg public.prospection_settings; local_day date; month_begin timestamptz;
 daily_cap integer; daily_used integer; monthly_used integer;
begin
 select * into cfg from public.prospection_settings where singleton for update;
 local_day:=(now() at time zone 'Europe/Paris')::date;
 month_begin:=date_trunc('month',now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
 if not cfg.enabled or not cfg.research_enabled or p_day<>local_day then return false; end if;
 select coalesce(sum(reserved_cents),0) into monthly_used from public.prospection_research_reservations where reserved_at>=month_begin;
 update public.prospection_settings set month_reserved_cents=monthly_used where singleton;
 if monthly_used+10>cfg.research_monthly_budget_cents then
  update public.prospection_settings set research_note='Plafond mensuel de recherche atteint. Vérifications et envois autorisés continuent.',
    next_research_at=((month_begin at time zone 'Europe/Paris')+interval '1 month') at time zone 'Europe/Paris' where singleton;
  return false;
 end if;
 daily_cap:=floor(cfg.research_monthly_budget_cents / extract(day from (date_trunc('month',local_day::timestamp)+interval '1 month - 1 day')))::integer;
 select coalesce(sum(reserved_cents),0) into daily_used from public.prospection_research_reservations
  where reserved_at>=local_day::timestamp at time zone 'Europe/Paris';
 if daily_used+10>daily_cap then
  update public.prospection_settings set research_note='Budget journalier préservé. Vérifications et envois autorisés continuent.',
   next_research_at=(local_day+1)::timestamp at time zone 'Europe/Paris' where singleton;
  return false;
 end if;
 if cfg.last_research_at is not null and cfg.last_research_at>now()-interval '1 hour' then
  update public.prospection_settings set research_note='Prochaine recherche IA à l’horaire affiché ; traitement de la file entre-temps.',
   next_research_at=cfg.last_research_at+interval '1 hour' where singleton;
  return false;
 end if;
 insert into public.prospection_research_reservations default values;
 update public.prospection_settings set last_research_day=local_day,last_research_at=now(),research_sequence=research_sequence+1,
  month_reserved_cents=monthly_used+10,research_note='Recherche IA en cours, enveloppe maximale réservée : 0,10 $.',next_research_at=now()+interval '1 hour' where singleton;
 return true;
end;
$$;
revoke all on function public.prospection_reserve_research(date) from public,anon,authenticated;
grant execute on function public.prospection_reserve_research(date) to service_role;
