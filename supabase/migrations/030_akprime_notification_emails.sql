-- AK PRIME : notifications e-mail sélectives, regroupées et protégées.
-- Par défaut : aucun envoi jusqu'à validation du domaine et clé Resend dans Supabase Vault.
create extension if not exists pg_net with schema extensions;
create table if not exists private.notification_mail_settings(
 singleton boolean primary key default true check(singleton),enabled boolean not null default false,
 from_address text not null default 'AK PRIME <notifications@akprime.fr>',
 site_url text not null default 'https://akprime.fr',enabled_at timestamptz
);
insert into private.notification_mail_settings(singleton) values(true) on conflict do nothing;
create table if not exists private.notification_mail_batches(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete cascade,
 recipient text not null,subject text not null,body text not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 request_id bigint,created_at timestamptz not null default now(),
 last_attempt_at timestamptz,next_attempt_at timestamptz not null default now(),
 attempts int not null default 0,sent_at timestamptz
);
create table if not exists private.notification_mail_outbox(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete cascade,
 event_key text not null unique,kind text not null,title text not null,
 created_at timestamptz not null default now(),
 deliver_after timestamptz not null default (now()+interval '12 minutes'),
 batch_id uuid references private.notification_mail_batches(id) on delete set null,
 sent_at timestamptz
);
create index if not exists ak_mail_pending_idx on private.notification_mail_outbox(deliver_after,client_id) where batch_id is null;
create index if not exists ak_mail_batch_state_idx on private.notification_mail_batches(status,next_attempt_at);
revoke all on private.notification_mail_settings,private.notification_mail_outbox,
 private.notification_mail_batches from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.queue_notification_mail(p_client uuid, p_key text, p_kind text, p_title text, p_delay interval DEFAULT '00:12:00'::interval)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
 if p_client is null or p_key is null or p_kind is null then return; end if;
 if not exists (
   select 1 from private.notification_mail_settings
    where singleton and enabled and enabled_at is not null
 ) then return; end if;
 if not exists (
   select 1 from public.clients c
   where c.id=p_client and c.auth_user_id is not null
     and c.portal_access_enabled is true and c.archived_at is null
     and coalesce(c.is_test,false)=false
     and c.email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
 ) then return; end if;
 insert into private.notification_mail_outbox(client_id,event_key,kind,title,deliver_after)
 values(p_client,p_key,p_kind,left(p_title,120),now()+p_delay)
 on conflict(event_key) do nothing;
end $function$;
revoke all on function private.queue_notification_mail(uuid,text,text,text,interval) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.queue_published_activity_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare label text; delay interval:=interval '12 minutes';
begin
 label:=case new.event_type
 when 'feedback_posted' then 'Votre coach a répondu à votre bilan'
 when 'test_published' then 'De nouveaux résultats de tests sont disponibles'
 when 'macro_published' then 'Votre budget nutritionnel est disponible'
 when 'visio_updated' then 'Votre rendez-vous a été mis à jour'
 when 'assessment_planned' then 'Une évaluation a été planifiée'
 when 'invoice_published' then 'Votre nouvelle facture est disponible'
 else null end;
 if label is not null then
  if new.event_type in ('feedback_posted','visio_updated','invoice_published') then delay:=interval '2 minutes';end if;
  perform private.queue_notification_mail(
    new.client_id,'activity:'||new.event_key,new.event_type,label,delay);
 end if;
 return new;
end $function$;
revoke all on function private.queue_published_activity_mail() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.queue_new_client_content_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
 if new.client_visible is true and new.archived_at is null and
   (tg_op='INSERT' or (old.client_visible is distinct from true or old.archived_at is not null)) then
   perform private.queue_notification_mail(new.client_id,
    'new-content:'||new.id::text,'content_published',
    'Un nouveau contenu de votre coach est disponible');
 end if;
 return new;
end $function$;
revoke all on function private.queue_new_client_content_mail() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.queue_important_cycle_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
 if tg_op='INSERT' or row(new.title,new.start_date,new.end_date,new.status)
    is distinct from row(old.title,old.start_date,old.end_date,old.status) then
   perform private.queue_notification_mail(new.client_id,
    'important-cycle:'||new.id::text||':'||
      md5(concat_ws('|',new.title,new.start_date::text,new.end_date::text,new.status)),
    'cycle_important','Votre cycle d’accompagnement a changé');
 end if;
 return new;
end $function$;
revoke all on function private.queue_important_cycle_mail() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.queue_renewal_confirmation_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
 if tg_op='UPDATE' and row(new.decision,new.payment_mode)
    is not distinct from row(old.decision,old.payment_mode) then return new;end if;
 if auth.uid() is null or not exists(
    select 1 from public.clients c where c.id=new.client_id and c.auth_user_id=auth.uid()
 ) then return new;end if;
 perform private.queue_notification_mail(new.client_id,
   'renewal-confirmed:'||new.id::text||':'||
     md5(concat_ws('|',new.decision,new.payment_mode)),
   'renewal_confirmed','Votre choix de renouvellement est enregistré',interval '2 minutes');
 return new;
end $function$;
revoke all on function private.queue_renewal_confirmation_mail() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.notification_mail_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare paris_time timestamp;
declare local_day date;
begin
 select (now() at time zone 'Europe/Paris') into paris_time;
 local_day:=paris_time::date;
 -- Onboarding : un seul mail si le questionnaire reste à compléter.
 perform private.queue_notification_mail(c.id,
   'initial-questionnaire:'||c.id::text||':'||coalesce(c.current_offer,''),
   'questionnaire_due','Votre questionnaire initial est à compléter', interval '0 minutes')
 from public.clients c join public.onboarding o on o.client_id=c.id
 where o.current_step='questionnaire' and c.created_at < now()-interval '24 hours';
 -- Bilan hebdomadaire disponible le vendredi à partir de 18 h, une seule relance.
 if extract(isodow from local_day)=5 and extract(hour from paris_time)>=18 then
   perform private.queue_notification_mail(c.id,'weekly-checkin:'||local_day::text,
     'weekly_due','Votre bilan hebdomadaire est prêt à être rempli',interval '0 minutes')
   from public.clients c where c.status='active' and c.start_date<=local_day
     and not exists(select 1 from public.checkins w
       where w.client_id=c.id and w.week_date=local_day);
 end if;
 -- Un seul rappel de visio, dans la fenêtre 24 heures -> 3 heures.
 perform private.queue_notification_mail(a.client_id,
   'visio-reminder:'||a.id::text||':'||a.starts_at::text,
   'visio_24h','Rappel : votre rendez-vous AK PRIME approche',interval '0 minutes')
 from public.appointments a where a.status in ('scheduled','confirmed')
   and a.starts_at > now()+interval '3 hours'
   and a.starts_at <=now()+interval '24 hours';
 -- Une seule relance de renouvellement lorsque l'échéance est à 14 jours ou moins.
 perform private.queue_notification_mail(c.id,
   'renewal-due:'||c.id::text||':'||c.engagement_end_date::text,
   'renewal_due','Votre accompagnement arrive à son échéance',interval '0 minutes')
 from public.clients c where c.status='active'
   and c.engagement_end_date::date between local_day and local_day+14
   and not exists(select 1 from public.renewal_choices r
      where r.client_id=c.id and r.due_date=c.engagement_end_date::date);
end $function$;
revoke all on function private.notification_mail_reminders() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.notification_mail_dispatch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare settings record;
declare token text;
declare b record;
declare cl record;
declare items record;
declare responses record;
declare target_id uuid;
declare net_request bigint;
declare body_message text;
declare subject_message text;
begin
 select * into settings from private.notification_mail_settings where singleton;
 if not coalesce(settings.enabled,false) then return; end if;
 select decrypted_secret into token from vault.decrypted_secrets
  where name='akprime_resend_api_key' order by created_at desc limit 1;
 if token is null or left(token,3)<>'re_' then return; end if;

 -- Confirmer seulement les appels acceptés par le prestataire.
 for responses in
   select b.id,b.attempts,r.status_code,r.timed_out,r.error_msg
   from private.notification_mail_batches b
   join net._http_response r on r.id=b.request_id
   where b.status='sending'
   order by b.created_at limit 100
 loop
   if responses.status_code between 200 and 299 and
      coalesce(responses.timed_out,false)=false then
     update private.notification_mail_batches
       set status='sent',sent_at=now() where id=responses.id;
     update private.notification_mail_outbox
       set sent_at=now() where batch_id=responses.id and sent_at is null;
   else
     update private.notification_mail_batches
       set status=case when attempts>=4 then 'failed' else 'pending' end,
       request_id=null,next_attempt_at=now()+interval '15 minutes' * greatest(1,attempts)
       where id=responses.id;
   end if;
 end loop;
 -- Une réponse perdue ne doit pas bloquer définitivement l'envoi.
 update private.notification_mail_batches
   set status=case when attempts>=4 then 'failed' else 'pending' end,
   request_id=null,next_attempt_at=now()+interval '20 minutes'
   where status='sending' and last_attempt_at<now()-interval '10 minutes'
   and not exists(select 1 from net._http_response r where r.id=request_id);

 perform private.notification_mail_reminders();

 -- Ne pas expédier une relance déjà résolue au moment de l'envoi.
 delete from private.notification_mail_outbox o
 where o.batch_id is null and
 (
   (o.kind='weekly_due' and exists(select 1 from public.checkins x
      where x.client_id=o.client_id and
      x.week_date=split_part(o.event_key,':',2)::date))
   or (o.kind='renewal_due' and exists(select 1 from public.renewal_choices r
      where r.client_id=o.client_id and
      r.due_date=split_part(o.event_key,':',3)::date))
   or (o.kind='questionnaire_due' and exists(
      select 1 from public.onboarding ob where ob.client_id=o.client_id and ob.current_step<>'questionnaire'))
   or (o.kind='visio_24h' and not exists(
      select 1 from public.appointments a
      where a.client_id=o.client_id and
      a.id::text=split_part(o.event_key,':',2)
      and a.status in ('scheduled','confirmed') and
      a.starts_at>now()+interval '3 hours'))
 );

 -- Constituer un e-mail par client avec les notifications rapprochées.
 for cl in
   select c.id,c.email from public.clients c
   where c.archived_at is null and c.portal_access_enabled
     and c.auth_user_id is not null and coalesce(c.is_test,false)=false
     and c.email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     and exists(select 1 from private.notification_mail_outbox q
       where q.client_id=c.id and q.batch_id is null and q.deliver_after<=now())
   order by c.id limit 25
 loop
   select array_agg(x.id) as ids,count(*)::int as qty,
     string_agg('- '||x.title,E'\n' order by x.created_at) as lines,
     min(x.title) as single_title
   into items
   from (select o.id,o.title,o.created_at
      from private.notification_mail_outbox o
      where o.client_id=cl.id and o.batch_id is null
        and o.deliver_after<=now()
      order by o.created_at,o.id limit 20 for update skip locked) x;
   if coalesce(items.qty,0)=0 then continue; end if;
   subject_message:=case when items.qty=1 then items.single_title
     else items.qty||' nouvelles informations dans votre espace AK PRIME' end;
   body_message:='Bonjour,'||E'\n\n'||
      case when items.qty=1 then 'Une information vous attend dans votre espace AK PRIME :'
      else 'Voici les nouvelles informations de votre accompagnement :' end||
      E'\n\n'||items.lines||E'\n\nConsultez votre espace sécurisé : '||
      settings.site_url||E'\n\nÀ bientôt,\nL’équipe AK PRIME'||
      E'\n\nCe message est lié à votre accompagnement. Il ne contient aucune donnée de santé.';
   insert into private.notification_mail_batches(client_id,recipient,subject,body)
      values(cl.id,cl.email,subject_message,body_message) returning id into target_id;
   update private.notification_mail_outbox set batch_id=target_id
      where id=any(items.ids);
 end loop;

 -- Réessayer les mêmes lots avec une clé d'idempotence stable.
 for b in select * from private.notification_mail_batches
   where status='pending' and next_attempt_at<=now()
   order by created_at limit 25 for update skip locked
 loop
   begin
     select net.http_post(
       url:='https://api.resend.com/emails',
       headers:=jsonb_build_object(
         'Authorization','Bearer '||token,
         'Content-Type','application/json',
         'Idempotency-Key','akprime-'||b.id::text),
       body:=jsonb_build_object(
         'from',settings.from_address,
         'to',jsonb_build_array(b.recipient),
         'subject',b.subject,
         'text',b.body
       ),
       timeout_milliseconds:=10000
     ) into net_request;
     update private.notification_mail_batches set
       status='sending',request_id=net_request,
       last_attempt_at=now(),attempts=attempts+1 where id=b.id;
   exception when others then
     update private.notification_mail_batches set
       attempts=attempts+1,
       next_attempt_at=now()+interval '15 minutes',
       status=case when attempts>=3 then 'failed' else 'pending' end
       where id=b.id;
   end;
 end loop;
end $function$;
revoke all on function private.notification_mail_dispatch() from public,anon,authenticated;

drop trigger if exists ak_mail_activity on public.client_activity_events;
CREATE TRIGGER ak_mail_activity AFTER INSERT ON public.client_activity_events FOR EACH ROW EXECUTE FUNCTION private.queue_published_activity_mail();

drop trigger if exists ak_mail_new_content on public.client_offer_entries;
CREATE TRIGGER ak_mail_new_content AFTER INSERT OR UPDATE ON public.client_offer_entries FOR EACH ROW EXECUTE FUNCTION private.queue_new_client_content_mail();

drop trigger if exists ak_mail_important_cycle on public.cycles;
CREATE TRIGGER ak_mail_important_cycle AFTER INSERT OR UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION private.queue_important_cycle_mail();

drop trigger if exists ak_mail_renewal_confirmed on public.renewal_choices;
CREATE TRIGGER ak_mail_renewal_confirmed AFTER INSERT OR UPDATE ON public.renewal_choices FOR EACH ROW EXECUTE FUNCTION private.queue_renewal_confirmation_mail();

select cron.schedule('akprime-notification-mails','*/5 * * * *',
 $$select private.notification_mail_dispatch()$$);
