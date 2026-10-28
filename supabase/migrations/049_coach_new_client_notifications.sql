-- AK PRIME : new client dossier → private, owner-only in-app alert + branded Resend email.
create table if not exists public.coach_new_client_events(
 owner_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null references public.clients(id) on delete cascade,
 created_at timestamptz not null default now(),
 is_test boolean not null default false,
 primary key(owner_id,client_id)
);
alter table public.coach_new_client_events enable row level security;
revoke all on public.coach_new_client_events from public,anon,authenticated;
grant select on public.coach_new_client_events to authenticated;
drop policy if exists coach_new_client_events_owner_read on public.coach_new_client_events;
create policy coach_new_client_events_owner_read on public.coach_new_client_events
 for select to authenticated using (owner_id=(select auth.uid()) and
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner'));

create table if not exists private.coach_new_client_mail_outbox(
 owner_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null references public.clients(id) on delete cascade,
 status text not null default 'pending'
   check (status in ('pending','sending','sent','failed')),
 request_id bigint,
 attempts integer not null default 0,
 created_at timestamptz not null default now(),
 last_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 delivered_to_provider_at timestamptz,
 last_error text,
 primary key(owner_id,client_id)
);
revoke all on private.coach_new_client_mail_outbox from public,anon,authenticated;
create index if not exists coach_new_client_mail_to_send_idx
 on private.coach_new_client_mail_outbox(status,next_attempt_at);

insert into private.akprime_auth_email_templates(kind,html)
values('coach_new_client',$new_client_mail$<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Nouveau client — AK PRIME</title>
<style>
@media only screen and (max-width:620px){
  .ak-wrap{padding:12px 7px!important}
  .ak-pad{padding-left:22px!important;padding-right:22px!important}
  .ak-heading{font-size:31px!important;line-height:1.17!important}
  .ak-art{display:none!important}
  .ak-cta{display:block!important}
  .ak-brand{font-size:23px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#e9eef5;color:#12263b;-webkit-text-size-adjust:100%;">
<div style="display:none!important;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;">Bienvenue chez AK PRIME — AK PRIME.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#e9eef5;border-collapse:collapse;">
<tr><td class="ak-wrap" align="center" style="padding:37px 12px 42px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border:1px solid #dae4ef;border-radius:16px;overflow:hidden;border-collapse:separate;border-spacing:0;">
<tr><td style="height:6px;background:#d8b16d;font-size:1px;line-height:6px;">&nbsp;</td></tr>
<tr><td class="ak-pad" style="background:#081421;padding:29px 39px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="width:42px;height:42px;background:#d8b16d;border-radius:8px;color:#081421;text-align:center;font:900 21px/42px Arial,Helvetica,sans-serif;">AK</td>
<td style="width:13px;">&nbsp;</td>
<td><div class="ak-brand" style="font:900 26px/1.05 Arial,Helvetica,sans-serif;letter-spacing:1.7px;color:#ffffff;">PRIME<span style="color:#d8b16d;">.</span></div>
<div style="font:700 8px/1.75 Arial,Helvetica,sans-serif;letter-spacing:2.3px;color:#90a7c1;margin-top:4px;">PRÉPARATION &amp; ACCOMPAGNEMENT</div></td>
</tr></table></td>
<td align="right" valign="middle" style="font:700 9px/1.7 Arial,Helvetica,sans-serif;letter-spacing:1.8px;color:#c3ceda;">PERFORMANCE<br>PROGRESSION<br><span style="color:#d8b16d;">ÉQUILIBRE</span></td>
</tr></table></td></tr>
<tr><td class="ak-pad" style="padding:31px 39px 38px;background:#0d1b2c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #2e3d52;padding-top:22px;">
<span style="font:900 10px/1.7 Arial,Helvetica,sans-serif;color:#d8b16d;letter-spacing:2.2px;">NOUVELLE INSCRIPTION</span>
</td></tr></table>
<p style="font:400 14px/1.65 Arial,Helvetica,sans-serif;color:#c6d6e6;margin:22px 0 0;">Bonjour,</p>
{{TEST_BADGE}}
<h1 class="ak-heading" style="font:900 40px/1.16 Arial,Helvetica,sans-serif;letter-spacing:-1.2px;color:#ffffff;margin:23px 0 13px;">Un nouveau client vous rejoint.</h1>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;"><tr><td style="height:4px;width:66px;background:#d8b16d;border-radius:4px;font-size:1px;">&nbsp;</td><td width="8">&nbsp;</td><td style="height:4px;width:20px;background:#2f66f6;border-radius:4px;font-size:1px;">&nbsp;</td></tr></table>
<p style="font:400 16px/1.7 Arial,Helvetica,sans-serif;color:#c6d6e6;margin:0 0 24px;">Un nouveau dossier vient d’être créé dans votre espace coach. Retrouvez ses informations et accompagnez son démarrage directement depuis le back-office AK PRIME.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="background:#d8b16d;border-radius:9px;">
<a class="ak-cta" href="{{CLIENT_LINK}}" style="display:block;padding:18px 14px;font:900 15px/1.35 Arial,Helvetica,sans-serif;color:#091927;text-decoration:none;text-align:center;">OUVRIR LE DOSSIER CLIENT &nbsp; &#8594;</a>
</td></tr></table>
<p style="color:#90a6be;font:700 11px/1.6 Arial,Helvetica,sans-serif;letter-spacing:1px;margin:22px 0 0;">UN OBJECTIF. UN PLAN. DES RÉSULTATS.</p>
</td></tr>
<tr><td style="height:7px;background:#2f66f6;font-size:1px;line-height:7px;">&nbsp;</td></tr>
<tr><td class="ak-pad" style="background:#ffffff;padding:34px 39px 31px;">
<h2 style="font:900 12px/1.6 Arial,Helvetica,sans-serif;letter-spacing:1.5px;color:#162c44;margin:0 0 17px;">INFORMATIONS DU DOSSIER</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafd;border:1px solid #dce5ee;border-left:5px solid #2f66f6;border-radius:10px;">
<tr><td style="padding:20px 22px 18px;">
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:0 0 0;"><span style="font-weight:900;color:#b78f4c;">1.</span> &nbsp; Client : {{CLIENT_NAME}}</p>
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:11px 0 0;"><span style="font-weight:900;color:#b78f4c;">2.</span> &nbsp; Formule : {{POLE_NAME}} — {{OFFER_NAME}}</p>
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:11px 0 0;"><span style="font-weight:900;color:#b78f4c;">3.</span> &nbsp; Statut : Onboarding — questionnaire initial à compléter</p>
</td></tr></table>
<p style="font:400 12px/1.7 Arial,Helvetica,sans-serif;color:#718397;margin:22px 0 0;">Aucune action n’est nécessaire pour créer ce dossier : il est déjà accessible dans votre back-office. Cet e-mail ne contient aucune donnée de santé.</p>
</td></tr>
<tr><td class="ak-pad" style="background:#091827;padding:28px 39px 31px;">
<p style="margin:0;font:900 17px/1.3 Arial,Helvetica,sans-serif;letter-spacing:1px;color:#ffffff;">AK <span style="color:#d8b16d;">PRIME.</span></p>
<p style="margin:7px 0 0;color:#cad5e2;font:400 13px/1.65 Arial,Helvetica,sans-serif;">La progression ne s'improvise pas.</p>
<p style="margin:18px 0 0;color:#cad5e2;font:400 12px/1.8 Arial,Helvetica,sans-serif;"><a href="https://akprime.fr" style="color:#d8b16d;text-decoration:none;">akprime.fr</a> &nbsp; / &nbsp; <a href="mailto:contact@akprime.fr" style="color:#cad5e2;text-decoration:none;">contact@akprime.fr</a></p>
<p style="margin:14px 0 0;color:#7891a8;font:400 10px/1.6 Arial,Helvetica,sans-serif;">Communication transactionnelle AK PRIME. Aucun mot de passe ne vous sera demandé par e-mail.</p>
</td></tr>
</table></td></tr></table>
</body></html>$new_client_mail$)
on conflict(kind) do update set html=excluded.html,updated_at=now();

create or replace function private.queue_coach_new_client_alert()
returns trigger language plpgsql security definer
set search_path=''
as $function$
declare v_owner record;
begin
 -- Every *new dossier* produces one event; updating it cannot duplicate notifications.
 for v_owner in
   select p.id from public.profiles p
   where p.role='owner' and p.email is not null and btrim(p.email)<>''
 loop
   insert into public.coach_new_client_events(owner_id,client_id,is_test)
   values(v_owner.id,new.id,coalesce(new.is_test,false))
   on conflict do nothing;
   insert into private.coach_new_client_mail_outbox(owner_id,client_id)
   values(v_owner.id,new.id)
   on conflict do nothing;
 end loop;
 return new;
end;
$function$;
revoke all on function private.queue_coach_new_client_alert() from public,anon,authenticated;
drop trigger if exists akprime_coach_new_client_alert on public.clients;
create trigger akprime_coach_new_client_alert
after insert on public.clients
for each row execute function private.queue_coach_new_client_alert();

create or replace function private.dispatch_coach_new_client_emails()
returns void language plpgsql security definer set search_path=''
as $function$
declare v_from text;
declare v_key text;
declare v_site text;
declare v_template text;
declare v_job record;
declare v_result record;
declare v_html text;
declare v_url text;
declare v_client_name text;
declare v_request bigint;
declare v_subject text;
begin
 select from_address,site_url into v_from,v_site
 from private.notification_mail_settings where singleton=true and enabled=true;
 if v_from is null then return;end if;
 select decrypted_secret into v_key from vault.decrypted_secrets
  where name='akprime_resend_api_key' order by created_at desc limit 1;
 if v_key is null or left(v_key,3)<>'re_' then return;end if;
 select html into v_template from private.akprime_auth_email_templates where kind='coach_new_client';
 if v_template is null then return;end if;
 -- Reconcile provider responses. A 2xx means accepted, not guaranteed inbox delivery.
 for v_result in
  select o.owner_id,o.client_id,o.attempts,r.status_code,r.error_msg,r.timed_out
  from private.coach_new_client_mail_outbox o
  join net._http_response r on r.id=o.request_id
  where o.status='sending'
  order by o.created_at limit 100
 loop
  if v_result.status_code between 200 and 299 and coalesce(v_result.timed_out,false)=false then
    update private.coach_new_client_mail_outbox
    set status='sent',delivered_to_provider_at=now(),last_error=null
    where owner_id=v_result.owner_id and client_id=v_result.client_id;
  else
    update private.coach_new_client_mail_outbox
    set status=case when attempts>=4 then 'failed' else 'pending' end,
        request_id=null,
        next_attempt_at=now()+interval '5 minutes'*greatest(1,attempts),
        last_error=left(coalesce(v_result.error_msg,'HTTP '||coalesce(v_result.status_code::text,'inconnu')),200)
    where owner_id=v_result.owner_id and client_id=v_result.client_id;
  end if;
 end loop;
 update private.coach_new_client_mail_outbox o
 set status=case when attempts>=4 then 'failed' else 'pending' end,
     request_id=null,next_attempt_at=now()+interval '5 minutes',last_error='Provider response unavailable'
 where o.status='sending' and o.last_attempt_at<now()-interval '10 minutes'
 and not exists(select 1 from net._http_response r where r.id=o.request_id);

 for v_job in
   select o.owner_id,o.client_id,o.attempts,c.first_name,c.last_name,
          c.current_pole,c.current_offer,c.is_test,p.email as owner_email
   from private.coach_new_client_mail_outbox o
   join public.clients c on c.id=o.client_id
   join public.profiles p on p.id=o.owner_id and p.role='owner'
   where o.status='pending' and o.next_attempt_at<=now()
     and p.email is not null and p.email~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
   order by o.created_at
   limit 20 for update of o skip locked
 loop
  v_client_name:=btrim(coalesce(v_job.first_name,'')||' '||coalesce(v_job.last_name,''));
  v_url:=coalesce(nullif(v_site,''),'https://akprime.fr')||
    '/?coach_client='||v_job.client_id::text;
  v_html:=replace(v_template,'{{CLIENT_NAME}}',private.ak_mail_escape(v_client_name));
  v_html:=replace(v_html,'{{POLE_NAME}}',private.ak_mail_escape(coalesce(v_job.current_pole,'Non défini')));
  v_html:=replace(v_html,'{{OFFER_NAME}}',private.ak_mail_escape(coalesce(v_job.current_offer,'À définir')));
  v_html:=replace(v_html,'{{CLIENT_LINK}}',private.ak_mail_escape(v_url));
  v_html:=replace(v_html,'{{TEST_BADGE}}',
    case when v_job.is_test then
    '<p style="background:#2b2b25;border:1px solid #987b50;border-radius:6px;padding:9px 12px;color:#f2d397;font:800 11px Arial,Helvetica,sans-serif;">DOSSIER DE SIMULATION — AUCUN PAIEMENT RÉEL</p>'
    else '' end);
  v_subject:=case when v_job.is_test then '[TEST] ' else '' end||
    'AK PRIME — Nouveau client : '||v_client_name;
  begin
    select net.http_post(
      url:='https://api.resend.com/emails',
      headers:=jsonb_build_object(
        'Authorization','Bearer '||v_key,
        'Content-Type','application/json',
        'Idempotency-Key','akprime-coach-new-client-'||v_job.owner_id::text||'-'||v_job.client_id::text),
      body:=jsonb_build_object(
        'from',v_from,
        'to',jsonb_build_array(v_job.owner_email),
        'subject',v_subject,
        'html',v_html,
        'text','Un nouveau dossier client a été créé sur AK PRIME.'||E'\n\n'||
           'Client : '||v_client_name||E'\n'||
           'Offre : '||coalesce(v_job.current_pole,'')||' — '||
              coalesce(v_job.current_offer,'')||E'\n'||
           case when v_job.is_test then 'SIMULATION — AUCUN PAIEMENT RÉEL'||E'\n' else '' end||
           'Statut : Onboarding'||E'\n'||
           'Ouvrir la fiche : '||v_url),
      timeout_milliseconds:=10000
    ) into v_request;
    update private.coach_new_client_mail_outbox
    set status='sending',request_id=v_request,attempts=attempts+1,
        last_attempt_at=now(),last_error=null
    where owner_id=v_job.owner_id and client_id=v_job.client_id;
  exception when others then
    update private.coach_new_client_mail_outbox
    set status=case when attempts>=3 then 'failed' else 'pending' end,
        attempts=attempts+1,
        next_attempt_at=now()+interval '5 minutes',
        last_error=left(sqlerrm,200)
    where owner_id=v_job.owner_id and client_id=v_job.client_id;
  end;
 end loop;
end;
$function$;
revoke all on function private.dispatch_coach_new_client_emails() from public,anon,authenticated;
select cron.schedule('akprime-coach-new-client-mails','* * * * *',
 $$select private.dispatch_coach_new_client_emails()$$);
