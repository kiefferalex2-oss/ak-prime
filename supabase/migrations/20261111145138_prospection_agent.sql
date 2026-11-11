-- Dedicated owner-only records. No change to client data or transactional mail.
create or replace function private.is_prospection_owner()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='owner');
$$;
revoke all on function private.is_prospection_owner() from public, anon;
grant execute on function private.is_prospection_owner() to authenticated, service_role;

create table if not exists public.prospection_settings (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  research_enabled boolean not null default true,
  sending_enabled boolean not null default false,
  daily_limit integer not null default 5 check(daily_limit between 1 and 10),
  last_research_day date,
  last_run_at timestamptz,
  last_status text not null default 'À configurer.'
);
insert into public.prospection_settings(singleton) values(true) on conflict(singleton) do nothing;

create table if not exists public.prospection_leads (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique check(length(fingerprint)=64),
  name text not null check(length(name) between 1 and 200),
  kind text not null check(kind in ('club','individual')),
  email text check(email is null or (email=lower(trim(email)) and length(email)<=254 and email !~ '[\r\n,; ]')),
  source_url text not null check(source_url like 'https://%' and length(source_url)<=2000),
  contact_url text not null check(contact_url like 'https://%' and length(contact_url)<=2000),
  opportunity_date date not null,
  evidence text not null check(length(evidence) between 25 and 1500),
  professional_relevance text not null default '' check(length(professional_relevance)<=1500),
  source_verified boolean not null default false,
  consent boolean not null default false,
  consent_note text not null default '' check(length(consent_note)<=1000),
  subject text not null check(length(subject) between 1 and 160 and subject !~ '[\r\n]'),
  body text not null check(length(body) between 40 and 1800),
  approved boolean not null default false,
  stage text not null default 'new' check(stage in ('new','ready','sending','sent','replied','opted_out','failed','uncertain')),
  message_id text unique,
  attempted_at timestamptz,
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  constraint prospection_consent_before_approval check (
    not approved or (email is not null and source_verified and
      ((kind='club' and length(trim(professional_relevance))>=10)
       or (kind='individual' and consent and length(trim(consent_note))>=10))))
);
create unique index if not exists prospection_email_unique on public.prospection_leads(lower(email)) where email is not null;
create index if not exists prospection_leads_stage_created on public.prospection_leads(stage,created_at);
alter table public.prospection_settings enable row level security;
alter table public.prospection_leads enable row level security;
revoke all on public.prospection_settings,public.prospection_leads from public,anon,authenticated;
grant select on public.prospection_settings,public.prospection_leads to authenticated;
grant update(enabled,research_enabled,sending_enabled,daily_limit) on public.prospection_settings to authenticated;
grant insert(fingerprint,name,kind,email,source_url,contact_url,opportunity_date,evidence,
  professional_relevance,source_verified,consent,consent_note,subject,body,approved,stage)
  on public.prospection_leads to authenticated;
grant update(name,kind,email,source_url,contact_url,opportunity_date,evidence,
  professional_relevance,source_verified,consent,consent_note,subject,body,approved,stage)
  on public.prospection_leads to authenticated;
grant all on public.prospection_settings,public.prospection_leads to service_role;
drop policy if exists prospection_settings_read on public.prospection_settings;
create policy prospection_settings_read on public.prospection_settings for select to authenticated
  using ((select private.is_prospection_owner()));
drop policy if exists prospection_settings_update on public.prospection_settings;
create policy prospection_settings_update on public.prospection_settings for update to authenticated
  using ((select private.is_prospection_owner())) with check((select private.is_prospection_owner()));
drop policy if exists prospection_leads_read on public.prospection_leads;
create policy prospection_leads_read on public.prospection_leads for select to authenticated
  using ((select private.is_prospection_owner()));
drop policy if exists prospection_leads_insert on public.prospection_leads;
create policy prospection_leads_insert on public.prospection_leads for insert to authenticated
  with check((select private.is_prospection_owner()));
drop policy if exists prospection_leads_update on public.prospection_leads;
create policy prospection_leads_update on public.prospection_leads for update to authenticated
  using ((select private.is_prospection_owner())) with check((select private.is_prospection_owner()));

create or replace function private.prospection_keep_terminal_state()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.stage='opted_out' and new.stage<>'opted_out' then
    raise exception 'Un contact opposé ne peut pas être réactivé.';
  end if;
  if old.message_id is not null and new.stage in ('new','ready') then
    raise exception 'Un envoi déjà réservé ne peut pas être relancé automatiquement.';
  end if;
  return new;
end;
$$;
revoke all on function private.prospection_keep_terminal_state() from public,anon,authenticated;
drop trigger if exists prospection_keep_terminal on public.prospection_leads;
create trigger prospection_keep_terminal before update on public.prospection_leads
  for each row execute function private.prospection_keep_terminal_state();

-- Service-only RPCs, invoker security: the runner's service role performs the work.
create or replace function public.prospection_reserve_research(p_day date)
returns boolean language plpgsql security invoker set search_path='' as $$
declare reserved boolean;
begin
  update public.prospection_settings set last_research_day=p_day
  where singleton and enabled and research_enabled
    and (last_research_day is null or last_research_day<p_day)
    and p_day=(now() at time zone 'Europe/Paris')::date
  returning true into reserved;
  return coalesce(reserved,false);
end;
$$;
revoke all on function public.prospection_reserve_research(date) from public,anon,authenticated;
grant execute on function public.prospection_reserve_research(date) to service_role;

create or replace function public.prospection_claim_message()
returns setof public.prospection_leads language plpgsql security invoker set search_path='' as $$
declare cfg public.prospection_settings; target uuid; local_now timestamp;
begin
  select * into cfg from public.prospection_settings where singleton for update;
  local_now:=now() at time zone 'Europe/Paris';
  if not cfg.enabled or not cfg.sending_enabled
    or extract(isodow from local_now)>5 or extract(hour from local_now)<9 or extract(hour from local_now)>=18 then return; end if;
  if (select count(*) from public.prospection_leads where
      attempted_at >= (local_now::date::timestamp at time zone 'Europe/Paris')) >= cfg.daily_limit then return; end if;
  select id into target from public.prospection_leads
  where stage='ready' and approved and message_id is null and source_verified and email is not null
    and opportunity_date between local_now::date-30 and local_now::date
    and ((kind='club' and length(trim(professional_relevance))>=10)
      or (kind='individual' and consent and length(trim(consent_note))>=10))
  order by created_at for update skip locked limit 1;
  if target is null then return; end if;
  return query update public.prospection_leads set stage='sending',attempted_at=now(),
    message_id='<'||gen_random_uuid()::text||'@akprime.fr>' where id=target returning *;
end;
$$;
revoke all on function public.prospection_claim_message() from public,anon,authenticated;
grant execute on function public.prospection_claim_message() to service_role;
