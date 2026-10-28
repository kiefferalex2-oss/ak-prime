-- Redirection exacte du rappel : sommeil vers Suivi, bilan vers Bilan. Exclure example.com.
CREATE OR REPLACE FUNCTION private.ak_client_reminder_dispatch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_now timestamp;
 v_day date;
 v_hour int;
 v_is_friday boolean;
 v_sender text;
 v_site text;
 v_key text;
 v_row record;
 v_reply record;
 v_email text;
 v_subject text;
 v_title text;
 v_body text;
 v_html text;
 v_request bigint;
 v_complete boolean;
begin
 select now() at time zone 'Europe/Paris' into v_now;
 v_day:=v_now::date;
 v_hour:=extract(hour from v_now)::int;
 v_is_friday:=extract(isodow from v_day)=5;
 select from_address,site_url into v_sender,v_site from private.notification_mail_settings
  where singleton=true and enabled=true;
 if v_sender is null then return;end if;
 select decrypted_secret into v_key from vault.decrypted_secrets
  where name='akprime_resend_api_key' order by created_at desc limit 1;
 if v_key is null or left(v_key,3)<>'re_' then return;end if;

 for v_reply in
  select d.client_id,d.kind,d.due_date,d.attempts,r.status_code,r.timed_out,r.error_msg
  from private.ak_client_reminder_delivery d join net._http_response r on r.id=d.request_id
  where d.status='sending' limit 200
 loop
  if v_reply.status_code between 200 and 299 and not coalesce(v_reply.timed_out,false) then
    update private.ak_client_reminder_delivery set status='sent',
      accepted_by_provider_at=now(),last_error=null
    where client_id=v_reply.client_id and kind=v_reply.kind and due_date=v_reply.due_date;
  else
    update private.ak_client_reminder_delivery
     set status=case when attempts>=3 then 'failed' else 'pending' end,
     next_attempt_at=now()+interval '10 minutes',request_id=null,
     last_error=left(coalesce(v_reply.error_msg,'HTTP '||v_reply.status_code::text),180)
    where client_id=v_reply.client_id and kind=v_reply.kind and due_date=v_reply.due_date;
  end if;
 end loop;
 update private.ak_client_reminder_delivery d
 set status=case when attempts>=3 then 'failed' else 'pending' end,
  request_id=null,next_attempt_at=now()+interval '10 minutes',
  last_error='Réponse fournisseur absente'
 where status='sending' and last_attempt_at<now()-interval '10 minutes'
  and not exists(select 1 from net._http_response r where r.id=d.request_id);

 -- Créer les rappels seulement à partir de 20h, jamais pour des dossiers
 -- non activés, en pause, futurs ou archivés.
 if v_hour=20 then
   insert into private.ak_client_reminder_delivery(client_id,kind,due_date)
   select c.id,'sleep',v_day from public.clients c
   where c.status='active' and c.portal_access_enabled and c.archived_at is null
    and c.start_date is not null and c.start_date<=v_day
    and c.current_pole='Performance' and c.current_offer='P3'
    and c.auth_user_id is not null
    and c.email~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+
    and not exists(select 1 from public.client_sleep_diary s
       where s.client_id=c.id and s.sleep_date=v_day)
   on conflict do nothing;
   if v_is_friday then
     insert into private.ak_client_reminder_delivery(client_id,kind,due_date)
     select c.id,'weekly',v_day from public.clients c
     where c.status='active' and c.portal_access_enabled and c.archived_at is null
       and c.start_date is not null and c.start_date<=v_day
       and c.auth_user_id is not null
       and c.email~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
       and not exists(select 1 from public.checkins w
         where w.client_id=c.id and w.week_date=v_day)
     on conflict do nothing;
   end if;
 end if;
 -- Les jobs en attente sont annulés si le client remplit l'échéance,
 -- se met en pause, quitte l'offre ou n'est plus actif.
 for v_row in
   select d.client_id,d.kind,d.due_date,d.attempts,c.email,c.first_name
   from private.ak_client_reminder_delivery d
   join public.clients c on c.id=d.client_id
   where d.status='pending' and d.next_attempt_at<=now()
    and d.due_date=v_day
   order by d.created_at limit 35 for update of d skip locked
 loop
   v_complete:=v_row.kind='sleep' and exists(select 1 from public.client_sleep_diary s
     where s.client_id=v_row.client_id and s.sleep_date=v_row.due_date)
     or v_row.kind='weekly' and exists(select 1 from public.checkins k
     where k.client_id=v_row.client_id and k.week_date=v_row.due_date);
   if v_complete or not exists(
     select 1 from public.clients c where c.id=v_row.client_id
      and c.status='active' and c.portal_access_enabled and c.archived_at is null
      and c.start_date<=v_row.due_date
      and (v_row.kind='weekly' or (c.current_pole='Performance' and c.current_offer='P3'))
   ) then
     update private.ak_client_reminder_delivery set status='cancelled'
      where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
     continue;
   end if;
   v_subject:=case when v_row.kind='sleep'
    then 'AK PRIME — Ton agenda de sommeil est à compléter'
    else 'AK PRIME — Ton bilan hebdomadaire t’attend' end;
   v_title:=case when v_row.kind='sleep'
    then 'Ta nuit du '||to_char(v_row.due_date,'DD/MM/YYYY')||' n’est pas enregistrée'
    else 'Ton bilan de la semaine reste à remplir' end;
   v_body:=case when v_row.kind='sleep'
    then 'Prends quelques minutes pour renseigner la durée, la qualité et les réveils de ta dernière nuit. Cela permet de mieux suivre ta récupération.'
    else 'Partage ton ressenti de la semaine, les séances manquées et tes éventuelles difficultés pour préparer les ajustements de ton coach.' end;
   v_html:=private.notification_mail_html(v_subject,jsonb_build_array(
      jsonb_build_object('title',v_title,'kind','reminder')
     ),coalesce(v_site,'https://akprime.fr')||case when v_row.kind='sleep' then '/?client_section=suivi' else '/?client_section=checkin' end,
     v_row.first_name);
   v_html:=replace(v_html,
     'Une nouveauté importante vous attend dans votre accompagnement.',
     private.ak_mail_escape(v_body));
   v_html:=replace(v_html,'Connectez-vous à votre espace AK PRIME pour consulter les informations.',
     private.ak_mail_escape(v_body));
   v_html:=replace(v_html,'CONSULTER MA NOTIFICATION',
     case when v_row.kind='sleep' then 'RENSEIGNER MON SOMMEIL'
      else 'COMPLÉTER MON BILAN' end);
   begin
     select net.http_post(
      url:='https://api.resend.com/emails',
      headers:=jsonb_build_object('Authorization','Bearer '||v_key,
       'Content-Type','application/json',
       'Idempotency-Key','akp-'||v_row.kind||'-'||v_row.client_id::text||'-'||v_row.due_date::text),
      body:=jsonb_build_object('from',v_sender,'to',jsonb_build_array(v_row.email),
       'subject',v_subject,'html',v_html,
       'text','Bonjour '||coalesce(v_row.first_name,'')||E',\n\n'||
       v_body||E'\n\nMon espace AK PRIME : '||
       coalesce(v_site,'https://akprime.fr')||case when v_row.kind='sleep' then '/?client_section=suivi' else '/?client_section=checkin' end),
      timeout_milliseconds:=10000
     ) into v_request;
     update private.ak_client_reminder_delivery
       set status='sending',request_id=v_request,last_attempt_at=now(),
       attempts=attempts+1,last_error=null
     where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
   exception when others then
     update private.ak_client_reminder_delivery
       set status=case when attempts>=3 then 'failed' else 'pending' end,
       attempts=attempts+1,next_attempt_at=now()+interval '10 minutes',
       last_error=left(sqlerrm,180)
     where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
   end;
 end loop;
end;
$function$

       and c.email not ilike '%@example.com'
    and not exists(select 1 from public.client_sleep_diary s
       where s.client_id=c.id and s.sleep_date=v_day)
   on conflict do nothing;
   if v_is_friday then
     insert into private.ak_client_reminder_delivery(client_id,kind,due_date)
     select c.id,'weekly',v_day from public.clients c
     where c.status='active' and c.portal_access_enabled and c.archived_at is null
       and c.start_date is not null and c.start_date<=v_day
       and c.auth_user_id is not null
       and c.email~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+
       and not exists(select 1 from public.checkins w
         where w.client_id=c.id and w.week_date=v_day)
     on conflict do nothing;
   end if;
 end if;
 -- Les jobs en attente sont annulés si le client remplit l'échéance,
 -- se met en pause, quitte l'offre ou n'est plus actif.
 for v_row in
   select d.client_id,d.kind,d.due_date,d.attempts,c.email,c.first_name
   from private.ak_client_reminder_delivery d
   join public.clients c on c.id=d.client_id
   where d.status='pending' and d.next_attempt_at<=now()
    and d.due_date=v_day
   order by d.created_at limit 35 for update of d skip locked
 loop
   v_complete:=v_row.kind='sleep' and exists(select 1 from public.client_sleep_diary s
     where s.client_id=v_row.client_id and s.sleep_date=v_row.due_date)
     or v_row.kind='weekly' and exists(select 1 from public.checkins k
     where k.client_id=v_row.client_id and k.week_date=v_row.due_date);
   if v_complete or not exists(
     select 1 from public.clients c where c.id=v_row.client_id
      and c.status='active' and c.portal_access_enabled and c.archived_at is null
      and c.start_date<=v_row.due_date
      and (v_row.kind='weekly' or (c.current_pole='Performance' and c.current_offer='P3'))
   ) then
     update private.ak_client_reminder_delivery set status='cancelled'
      where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
     continue;
   end if;
   v_subject:=case when v_row.kind='sleep'
    then 'AK PRIME — Ton agenda de sommeil est à compléter'
    else 'AK PRIME — Ton bilan hebdomadaire t’attend' end;
   v_title:=case when v_row.kind='sleep'
    then 'Ta nuit du '||to_char(v_row.due_date,'DD/MM/YYYY')||' n’est pas enregistrée'
    else 'Ton bilan de la semaine reste à remplir' end;
   v_body:=case when v_row.kind='sleep'
    then 'Prends quelques minutes pour renseigner la durée, la qualité et les réveils de ta dernière nuit. Cela permet de mieux suivre ta récupération.'
    else 'Partage ton ressenti de la semaine, les séances manquées et tes éventuelles difficultés pour préparer les ajustements de ton coach.' end;
   v_html:=private.notification_mail_html(v_subject,jsonb_build_array(
      jsonb_build_object('title',v_title,'kind','reminder')
     ),coalesce(v_site,'https://akprime.fr')||case when v_row.kind='sleep' then '/?client_section=suivi' else '/?client_section=checkin' end,
     v_row.first_name);
   v_html:=replace(v_html,
     'Une nouveauté importante vous attend dans votre accompagnement.',
     private.ak_mail_escape(v_body));
   v_html:=replace(v_html,'Connectez-vous à votre espace AK PRIME pour consulter les informations.',
     private.ak_mail_escape(v_body));
   v_html:=replace(v_html,'CONSULTER MA NOTIFICATION',
     case when v_row.kind='sleep' then 'RENSEIGNER MON SOMMEIL'
      else 'COMPLÉTER MON BILAN' end);
   begin
     select net.http_post(
      url:='https://api.resend.com/emails',
      headers:=jsonb_build_object('Authorization','Bearer '||v_key,
       'Content-Type','application/json',
       'Idempotency-Key','akp-'||v_row.kind||'-'||v_row.client_id::text||'-'||v_row.due_date::text),
      body:=jsonb_build_object('from',v_sender,'to',jsonb_build_array(v_row.email),
       'subject',v_subject,'html',v_html,
       'text','Bonjour '||coalesce(v_row.first_name,'')||E',\n\n'||
       v_body||E'\n\nMon espace AK PRIME : '||
       coalesce(v_site,'https://akprime.fr')||case when v_row.kind='sleep' then '/?client_section=suivi' else '/?client_section=checkin' end),
      timeout_milliseconds:=10000
     ) into v_request;
     update private.ak_client_reminder_delivery
       set status='sending',request_id=v_request,last_attempt_at=now(),
       attempts=attempts+1,last_error=null
     where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
   exception when others then
     update private.ak_client_reminder_delivery
       set status=case when attempts>=3 then 'failed' else 'pending' end,
       attempts=attempts+1,next_attempt_at=now()+interval '10 minutes',
       last_error=left(sqlerrm,180)
     where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
   end;
 end loop;
end;
$function$

       and c.email not ilike '%@example.com'
       and not exists(select 1 from public.checkins w
         where w.client_id=c.id and w.week_date=v_day)
     on conflict do nothing;
   end if;
 end if;
 -- Les jobs en attente sont annulés si le client remplit l'échéance,
 -- se met en pause, quitte l'offre ou n'est plus actif.
 for v_row in
   select d.client_id,d.kind,d.due_date,d.attempts,c.email,c.first_name
   from private.ak_client_reminder_delivery d
   join public.clients c on c.id=d.client_id
   where d.status='pending' and d.next_attempt_at<=now()
    and d.due_date=v_day
   order by d.created_at limit 35 for update of d skip locked
 loop
   v_complete:=v_row.kind='sleep' and exists(select 1 from public.client_sleep_diary s
     where s.client_id=v_row.client_id and s.sleep_date=v_row.due_date)
     or v_row.kind='weekly' and exists(select 1 from public.checkins k
     where k.client_id=v_row.client_id and k.week_date=v_row.due_date);
   if v_complete or not exists(
     select 1 from public.clients c where c.id=v_row.client_id
      and c.status='active' and c.portal_access_enabled and c.archived_at is null
      and c.start_date<=v_row.due_date
      and (v_row.kind='weekly' or (c.current_pole='Performance' and c.current_offer='P3'))
   ) then
     update private.ak_client_reminder_delivery set status='cancelled'
      where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
     continue;
   end if;
   v_subject:=case when v_row.kind='sleep'
    then 'AK PRIME — Ton agenda de sommeil est à compléter'
    else 'AK PRIME — Ton bilan hebdomadaire t’attend' end;
   v_title:=case when v_row.kind='sleep'
    then 'Ta nuit du '||to_char(v_row.due_date,'DD/MM/YYYY')||' n’est pas enregistrée'
    else 'Ton bilan de la semaine reste à remplir' end;
   v_body:=case when v_row.kind='sleep'
    then 'Prends quelques minutes pour renseigner la durée, la qualité et les réveils de ta dernière nuit. Cela permet de mieux suivre ta récupération.'
    else 'Partage ton ressenti de la semaine, les séances manquées et tes éventuelles difficultés pour préparer les ajustements de ton coach.' end;
   v_html:=private.notification_mail_html(v_subject,jsonb_build_array(
      jsonb_build_object('title',v_title,'kind','reminder')
     ),coalesce(v_site,'https://akprime.fr')||case when v_row.kind='sleep' then '/?client_section=suivi' else '/?client_section=checkin' end,
     v_row.first_name);
   v_html:=replace(v_html,
     'Une nouveauté importante vous attend dans votre accompagnement.',
     private.ak_mail_escape(v_body));
   v_html:=replace(v_html,'Connectez-vous à votre espace AK PRIME pour consulter les informations.',
     private.ak_mail_escape(v_body));
   v_html:=replace(v_html,'CONSULTER MA NOTIFICATION',
     case when v_row.kind='sleep' then 'RENSEIGNER MON SOMMEIL'
      else 'COMPLÉTER MON BILAN' end);
   begin
     select net.http_post(
      url:='https://api.resend.com/emails',
      headers:=jsonb_build_object('Authorization','Bearer '||v_key,
       'Content-Type','application/json',
       'Idempotency-Key','akp-'||v_row.kind||'-'||v_row.client_id::text||'-'||v_row.due_date::text),
      body:=jsonb_build_object('from',v_sender,'to',jsonb_build_array(v_row.email),
       'subject',v_subject,'html',v_html,
       'text','Bonjour '||coalesce(v_row.first_name,'')||E',\n\n'||
       v_body||E'\n\nMon espace AK PRIME : '||
       coalesce(v_site,'https://akprime.fr')||case when v_row.kind='sleep' then '/?client_section=suivi' else '/?client_section=checkin' end),
      timeout_milliseconds:=10000
     ) into v_request;
     update private.ak_client_reminder_delivery
       set status='sending',request_id=v_request,last_attempt_at=now(),
       attempts=attempts+1,last_error=null
     where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
   exception when others then
     update private.ak_client_reminder_delivery
       set status=case when attempts>=3 then 'failed' else 'pending' end,
       attempts=attempts+1,next_attempt_at=now()+interval '10 minutes',
       last_error=left(sqlerrm,180)
     where client_id=v_row.client_id and kind=v_row.kind and due_date=v_row.due_date;
   end;
 end loop;
end;
$function$
