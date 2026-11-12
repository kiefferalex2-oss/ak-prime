-- Autonomous B2B authority is separate from the owner's per-message approval.
alter table public.prospection_settings add column autonomous_email_enabled boolean not null default false;
alter table public.prospection_leads
 add column buyer_role text not null default '' check(buyer_role in ('','sports_club','employer_cse','individual_request')),
 add column autonomous_authorized_at timestamptz,
 add column autonomous_snapshot jsonb;
grant update(autonomous_email_enabled) on public.prospection_settings to authenticated;

create or replace function private.prospection_email_snapshot(p public.prospection_leads)
returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('name',p.name,'kind',p.kind,'buyer_role',p.buyer_role,'email',p.email,
  'source_url',p.source_url,'contact_url',p.contact_url,'opportunity_date',p.opportunity_date,
  'evidence',p.evidence,'professional_relevance',p.professional_relevance,'source_verified',p.source_verified,
  'subject',p.subject,'body',p.body,'consent',p.consent,'consent_note',p.consent_note);
$$;
revoke all on function private.prospection_email_snapshot(public.prospection_leads) from public,anon,authenticated;
grant execute on function private.prospection_email_snapshot(public.prospection_leads) to service_role;

create or replace function private.prospection_is_buyer(p public.prospection_leads)
returns boolean language sql immutable security invoker set search_path='' as $$
 select p.kind in ('club','association','professional') and p.source_verified and p.email is not null
 and length(trim(p.professional_relevance))>=10
 and lower(p.name) !~ '(maison sport.?santé|sport.?santé|coaching|coach sportif|préparateur physique|préparation mentale|fitness|personal trainer|salle de sport)'
 and lower(substring(p.source_url from '^https://(?:www\.)?([^/:?#]+)')) = lower(substring(p.contact_url from '^https://(?:www\.)?([^/:?#]+)'))
 and lower(p.source_url) !~ '^https://([^/]+\.)?(facebook\.com|instagram\.com|linkedin\.com|tiktok\.com)([/:?#]|$)'
 and ((p.buyer_role='sports_club' and lower(p.name||' '||p.evidence) ~ '\m(handball|football|basket|basketball|rugby|boxe|judo|volley|athlétisme|natation|aviron|tennis|escrime|karaté|gymnastique|badminton|cyclisme|triathlon|hockey|futsal)\M')
 or (p.buyer_role='employer_cse' and lower(p.name||' '||p.evidence) ~ '\m(salariés|salarié|employeur|employés|effectif|cse|comité social|ressources humaines)\M'));
$$;
revoke all on function private.prospection_is_buyer(public.prospection_leads) from public,anon,authenticated;
grant execute on function private.prospection_is_buyer(public.prospection_leads) to service_role;

create or replace function public.prospection_authorize_autonomous(p_id uuid,p_snapshot jsonb)
returns setof public.prospection_leads language plpgsql security invoker set search_path='' as $$
declare cfg public.prospection_settings;
begin
 select * into cfg from public.prospection_settings where singleton for update;
 if not cfg.enabled or not cfg.sending_enabled or not cfg.autonomous_email_enabled then return; end if;
 return query update public.prospection_leads l set stage='ready',autonomous_authorized_at=now(),
  autonomous_snapshot=private.prospection_email_snapshot(l)
 where l.id=p_id and l.stage='new' and not l.approved and l.message_id is null
 and l.opportunity_date between (now() at time zone 'Europe/Paris')::date-30 and (now() at time zone 'Europe/Paris')::date
 and private.prospection_is_buyer(l) and private.prospection_email_snapshot(l)=p_snapshot returning l.*;
end;
$$;
revoke all on function public.prospection_authorize_autonomous(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prospection_authorize_autonomous(uuid,jsonb) to service_role;

create or replace function private.prospection_revoke_changed_email()
returns trigger language plpgsql security invoker set search_path='' as $$
declare previous jsonb; updated jsonb;
begin
 previous:=to_jsonb(old)-array['stage','approved','sent_at','replied_at','attempted_at','message_id','review_notified_at','reply_notified_at','autonomous_authorized_at','autonomous_snapshot'];
 updated:=to_jsonb(new)-array['stage','approved','sent_at','replied_at','attempted_at','message_id','review_notified_at','reply_notified_at','autonomous_authorized_at','autonomous_snapshot'];
 if previous is distinct from updated then
  if old.message_id is not null then raise exception 'Le message déjà réservé ne peut plus être modifié.'; end if;
  new.autonomous_authorized_at:=null;new.autonomous_snapshot:=null;
  if old.approved or old.autonomous_authorized_at is not null then
   new.approved:=false;
   if new.stage='ready' then new.stage:='new'; end if;
  end if;
 end if;
 return new;
end;
$$;

create or replace function public.prospection_claim_message()
returns setof public.prospection_leads language plpgsql security invoker set search_path='' as $$
declare cfg public.prospection_settings; target uuid; local_now timestamp;
begin
 select * into cfg from public.prospection_settings where singleton for update;
 local_now:=now() at time zone 'Europe/Paris';
 if not cfg.enabled or not cfg.sending_enabled or extract(isodow from local_now)>5
  or extract(hour from local_now)<9 or extract(hour from local_now)>=18 then return; end if;
 if (select count(*) from public.prospection_leads where attempted_at >= (local_now::date::timestamp at time zone 'Europe/Paris')) >= cfg.daily_limit then return; end if;
 select l.id into target from public.prospection_leads l
 where l.stage='ready' and l.message_id is null and l.source_verified and l.email is not null
 and l.opportunity_date between local_now::date-30 and local_now::date
 and ((l.approved and ((l.kind in ('club','association','professional') and length(trim(l.professional_relevance))>=10)
  or (l.kind='individual' and l.consent and length(trim(l.consent_note))>=10)))
 or (cfg.autonomous_email_enabled and l.autonomous_authorized_at is not null
  and private.prospection_is_buyer(l) and l.autonomous_snapshot=private.prospection_email_snapshot(l)))
 order by l.created_at for update skip locked limit 1;
 if target is null then return; end if;
 return query update public.prospection_leads set stage='sending',attempted_at=now(),
  message_id='<'||gen_random_uuid()::text||'@akprime.fr>' where id=target returning *;
end;
$$;
revoke all on function public.prospection_claim_message() from public,anon,authenticated;
grant execute on function public.prospection_claim_message() to service_role;
