alter table public.prospection_settings
  add column if not exists creative_enabled boolean not null default true,
  add column if not exists last_creative_day date;
grant update(creative_enabled) on public.prospection_settings to authenticated;
alter table public.prospection_leads drop constraint if exists prospection_leads_kind_check;
alter table public.prospection_leads add constraint prospection_leads_kind_check
  check(kind in ('club','association','professional','individual'));
alter table public.prospection_leads drop constraint if exists prospection_consent_before_approval;
alter table public.prospection_leads add constraint prospection_consent_before_approval check (
  not approved or (email is not null and source_verified and
    ((kind in ('club','association','professional') and length(trim(professional_relevance))>=10)
    or (kind='individual' and consent and length(trim(consent_note))>=10))));

create table if not exists public.prospection_drafts (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique,
  kind text not null check(kind in ('publication','suggestion')),
  channel text not null check(channel in ('facebook','instagram','strategy')),
  pole text not null check(pole in ('performance','forme_sante','mental')),
  target_label text not null default 'AK PRIME' check(length(target_label) between 1 and 200),
  title text not null check(length(title) between 4 and 120),
  body text not null check(length(body) between 40 and 2100),
  visual_title text not null default '' check(length(visual_title)<=90),
  visual_points text not null default '' check(length(visual_points)<=280),
  rationale text not null default '' check(length(rationale)<=1000),
  asset_url text check(asset_url is null or asset_url like 'https://gptvgldboqarfklorjip.supabase.co/storage/v1/object/public/akprime-promotion/%'),
  status text not null default 'draft' check(status in ('draft','approved','publishing','published','rejected','uncertain')),
  approved_at timestamptz,
  approved_snapshot jsonb,
  published_url text check(published_url is null or published_url like 'https://%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((kind='suggestion' and channel='strategy') or (kind='publication' and channel in ('facebook','instagram')))
);
alter table public.prospection_drafts enable row level security;
revoke all on public.prospection_drafts from public,anon,authenticated;
grant select on public.prospection_drafts to authenticated;
grant update(channel,target_label,title,body,visual_title,visual_points,rationale,asset_url,status)
  on public.prospection_drafts to authenticated;
grant all on public.prospection_drafts to service_role;
drop policy if exists prospection_drafts_read on public.prospection_drafts;
create policy prospection_drafts_read on public.prospection_drafts for select to authenticated
  using((select private.is_prospection_owner()));
drop policy if exists prospection_drafts_update on public.prospection_drafts;
create policy prospection_drafts_update on public.prospection_drafts for update to authenticated
  using((select private.is_prospection_owner())) with check((select private.is_prospection_owner()));

create or replace function private.prospection_approval_snapshot()
returns trigger language plpgsql security invoker set search_path='' as $$
declare content jsonb; previous_content jsonb;
begin
  content:=jsonb_build_object('kind',new.kind,'channel',new.channel,'pole',new.pole,'target_label',new.target_label,
    'title',new.title,'body',new.body,'visual_title',new.visual_title,'visual_points',new.visual_points,'rationale',new.rationale,'asset_url',new.asset_url);
  previous_content:=jsonb_build_object('kind',old.kind,'channel',old.channel,'pole',old.pole,'target_label',old.target_label,
    'title',old.title,'body',old.body,'visual_title',old.visual_title,'visual_points',old.visual_points,'rationale',old.rationale,'asset_url',old.asset_url);
  if current_user='authenticated' and new.status in ('publishing','published','uncertain') then
    raise exception 'La confirmation de publication est réservée au service.';
  end if;
  if old.status in ('publishing','published','uncertain') and
    (content is distinct from previous_content or new.status in ('draft','approved','rejected')) then
    raise exception 'Publication déjà réservée : vérifier le résultat avant toute intervention.';
  end if;
  if content is distinct from previous_content then
    new.status:='draft'; new.approved_at:=null; new.approved_snapshot:=null;
  elsif new.status='approved' and old.status<>'approved' then
    if new.kind='publication' and new.asset_url is null then
      raise exception 'Le visuel exact doit être enregistré avant validation.';
    end if;
    new.approved_at:=now(); new.approved_snapshot:=content;
  elsif new.status in ('draft','rejected') then
    new.approved_at:=null; new.approved_snapshot:=null;
  end if;
  new.updated_at:=clock_timestamp();
  return new;
end;
$$;
revoke all on function private.prospection_approval_snapshot() from public,anon,authenticated;
drop trigger if exists prospection_approval_snapshot on public.prospection_drafts;
create trigger prospection_approval_snapshot before update on public.prospection_drafts
  for each row execute function private.prospection_approval_snapshot();

create or replace function public.prospection_reserve_creative(p_day date)
returns boolean language plpgsql security invoker set search_path='' as $$
declare reserved boolean;
begin
  update public.prospection_settings set last_creative_day=p_day
  where singleton and enabled and creative_enabled
    and (last_creative_day is null or last_creative_day<p_day)
    and p_day=(now() at time zone 'Europe/Paris')::date returning true into reserved;
  return coalesce(reserved,false);
end;
$$;
revoke all on function public.prospection_reserve_creative(date) from public,anon,authenticated;
grant execute on function public.prospection_reserve_creative(date) to service_role;

create or replace function public.prospection_claim_publication(p_id uuid)
returns setof public.prospection_drafts language sql security invoker set search_path='' as $$
  update public.prospection_drafts set status='publishing'
  where id=p_id and kind='publication' and status='approved'
    and (select enabled from public.prospection_settings where singleton)
    and approved_snapshot=jsonb_build_object('kind',kind,'channel',channel,'pole',pole,'target_label',target_label,
      'title',title,'body',body,'visual_title',visual_title,'visual_points',visual_points,'rationale',rationale,'asset_url',asset_url)
  returning *;
$$;
revoke all on function public.prospection_claim_publication(uuid) from public,anon,authenticated;
grant execute on function public.prospection_claim_publication(uuid) to service_role;

-- Only approved promotional graphics can be uploaded by the owner; no prospect data here.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('akprime-promotion','akprime-promotion',true,3000000,array['image/jpeg'])
  on conflict(id) do nothing;
drop policy if exists akprime_promotion_owner_insert on storage.objects;
create policy akprime_promotion_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='akprime-promotion' and (select private.is_prospection_owner()));
drop policy if exists akprime_promotion_owner_read on storage.objects;
create policy akprime_promotion_owner_read on storage.objects for select to authenticated
  using(bucket_id='akprime-promotion' and (select private.is_prospection_owner()));

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
    and ((kind in ('club','association','professional') and length(trim(professional_relevance))>=10)
      or (kind='individual' and consent and length(trim(consent_note))>=10))
  order by created_at for update skip locked limit 1;
  if target is null then return; end if;
  return query update public.prospection_leads set stage='sending',attempted_at=now(),
    message_id='<'||gen_random_uuid()::text||'@akprime.fr>' where id=target returning *;
end;
$$;
revoke all on function public.prospection_claim_message() from public,anon,authenticated;
grant execute on function public.prospection_claim_message() to service_role;
