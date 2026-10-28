-- Corrige collision PL/pgSQL de la variable record b avec l'alias SQL b.
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
   select batch.id,batch.attempts,r.status_code,r.timed_out,r.error_msg
   from private.notification_mail_batches batch
   join net._http_response r on r.id=batch.request_id
   where batch.status='sending'
   order by batch.created_at limit 100
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
   select c.id,c.email,c.first_name from public.clients c
   where c.archived_at is null and c.portal_access_enabled
     and c.auth_user_id is not null and coalesce(c.is_test,false)=false
     and c.email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     and exists(select 1 from private.notification_mail_outbox q
       where q.client_id=c.id and q.batch_id is null and q.deliver_after<=now())
   order by c.id limit 25
 loop
   select array_agg(x.id) as ids,count(*)::int as qty,
     string_agg('- '||x.title,E'\n' order by x.created_at) as lines,
     (array_agg(x.title order by x.created_at,x.id))[1] as first_title,
     jsonb_agg(jsonb_build_object('kind',x.kind,'title',x.title)
       order by x.created_at,x.id) as events
   into items
   from (select o.id,o.title,o.kind,o.created_at
      from private.notification_mail_outbox o
      where o.client_id=cl.id and o.batch_id is null
        and o.deliver_after<=now()
      order by o.created_at,o.id limit 20 for update skip locked) x;
   if coalesce(items.qty,0)=0 then continue; end if;
   subject_message:='AK PRIME — '||case when items.qty=1 then items.first_title
     else items.first_title||' + '||(items.qty-1)::text||
       case when items.qty=2 then ' autre notification' else ' autres notifications' end end;
   body_message:='Bonjour,'||E'\n\n'||
      case when items.qty=1 then 'Une information vous attend dans votre espace AK PRIME :'
      else 'Voici les nouvelles informations de votre accompagnement :' end||
      E'\n\n'||items.lines||E'\n\nConsultez votre espace sécurisé : '||
      settings.site_url||E'\n\nÀ bientôt,\nL’équipe AK PRIME'||
      E'\n\nCe message est lié à votre accompagnement. Il ne contient aucune donnée de santé.';
   insert into private.notification_mail_batches(client_id,recipient,subject,body,body_html)
      values(cl.id,cl.email,subject_message,body_message,
       private.notification_mail_html(subject_message,items.events,settings.site_url,cl.first_name))
      returning id into target_id;
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
         'text',b.body,
         'html',coalesce(b.body_html,
           private.notification_mail_html(b.subject,jsonb_build_array(
             jsonb_build_object('title',b.subject,'kind','content_published')),
             settings.site_url,''))
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
