-- AK PRIME : modèles HTML réels pour les e-mails de notification.
-- Complément de 030_akprime_notification_emails.sql.
-- L'envoi reste contrôlé par private.notification_mail_settings.enabled.
alter table private.notification_mail_batches add column if not exists body_html text;

CREATE OR REPLACE FUNCTION private.ak_mail_escape(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'pg_catalog'
AS $function$
  select replace(replace(replace(replace(replace(p_value,
    '&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;'),'''','&#39;')
$function$;
revoke all on function private.ak_mail_escape(text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.notification_mail_html(p_subject text, p_items jsonb, p_site_url text, p_first_name text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  item jsonb;
  kind text;
  label text;
  headline text;
  lead text;
  card_label text;
  description text;
  icon_label text;
  cards text:='';
  html text;
  n integer;
  greeting text;
begin
 n:=jsonb_array_length(coalesce(p_items,'[]'::jsonb));
 headline:=case
   when n=1 then coalesce(p_items->0->>'title','Une nouvelle information')
   else n||' nouvelles informations vous attendent' end;
 lead:=case when n=1
   then 'Une mise à jour importante de votre accompagnement est disponible.'
   else 'Voici les nouveautés importantes de votre accompagnement, regroupées dans un seul message.'
   end;
 greeting:=case when nullif(btrim(coalesce(p_first_name,'')),'') is not null
   then 'Bonjour '||initcap(btrim(p_first_name))||','
   else 'Bonjour,' end;
 for item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
   kind:=coalesce(item->>'kind','');
   label:=coalesce(item->>'title','Nouvelle information');
   card_label:=case kind
    when 'test_published' then 'RÉSULTATS & PROGRESSION'
    when 'feedback_posted' then 'RETOUR DE VOTRE COACH'
    when 'macro_published' then 'NUTRITION'
    when 'cycle_important' then 'PROGRAMMATION'
    when 'content_published' then 'NOUVEAU CONTENU'
    when 'visio_updated' then 'RENDEZ-VOUS'
    when 'assessment_planned' then 'ÉVALUATION'
    when 'invoice_published' then 'FACTURATION'
    when 'visio_24h' then 'RAPPEL DE RENDEZ-VOUS'
    when 'weekly_due' then 'BILAN HEBDOMADAIRE'
    when 'questionnaire_due' then 'DÉBUT D’ACCOMPAGNEMENT'
    when 'renewal_due' then 'RENOUVELLEMENT'
    when 'renewal_confirmed' then 'CONFIRMATION'
    else 'VOTRE ACCOMPAGNEMENT' end;
   description:=case kind
    when 'test_published' then 'Vos nouveaux résultats sont disponibles dans le Passeport, avec votre suivi de progression.'
    when 'feedback_posted' then 'Votre coach a pris connaissance de votre bilan et vous a transmis son retour personnalisé.'
    when 'macro_published' then 'Retrouvez votre budget nutritionnel dans votre espace personnel.'
    when 'cycle_important' then 'Les informations importantes de votre cycle d’entraînement ont changé.'
    when 'content_published' then 'Un nouveau contenu vous attend dans votre espace de suivi.'
    when 'visio_updated' then 'Consultez votre agenda pour connaître les informations actualisées de votre rendez-vous.'
    when 'assessment_planned' then 'Une nouvelle échéance d’évaluation a été programmée pour votre suivi.'
    when 'invoice_published' then 'Votre document de facturation est accessible depuis votre espace.'
    when 'visio_24h' then 'Votre prochaine visio approche. Vous retrouverez l’horaire dans votre agenda.'
    when 'weekly_due' then 'Votre bilan de la semaine est disponible. Prenez quelques minutes pour le compléter.'
    when 'questionnaire_due' then 'Complétez votre questionnaire initial pour préparer le début de votre accompagnement.'
    when 'renewal_due' then 'La fin de votre engagement approche. Indiquez votre choix depuis votre espace.'
    when 'renewal_confirmed' then 'Votre décision a bien été enregistrée dans votre dossier.'
    else 'Connectez-vous à votre espace AK PRIME pour consulter les informations.' end;
   cards:=cards||
    '<tr><td style="padding:0 0 12px 0;">'||
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e3e9f0;border-left:4px solid #bd985e;border-radius:12px;">'||
    '<tr><td style="padding:21px 24px;">'||
    '<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.7px;font-weight:700;color:#a0783b;">'||
      private.ak_mail_escape(card_label)||'</p>'||
    '<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.4;font-weight:700;color:#112c46;">'||
      private.ak_mail_escape(label)||'</p>'||
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#617185;">'||
      private.ak_mail_escape(description)||'</p>'||
    '</td></tr></table></td></tr>';
 end loop;
 html:=$mail$
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{SUBJECT}}</title>
<style>
@media only screen and (max-width:640px){
 .ak-outer{padding:14px 8px !important}
 .ak-pad{padding-left:22px !important;padding-right:22px !important}
 .ak-hero{font-size:29px !important}
 .ak-button{display:block !important;text-align:center !important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f1f4f8;color:#142b43;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{{PREHEADER}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f1f4f8;border-collapse:collapse;">
<tr><td class="ak-outer" align="center" style="padding:42px 14px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e4eaf0;border-radius:19px;overflow:hidden;">

<tr><td class="ak-pad" style="background:#11283f;padding:31px 40px 30px;border-bottom:3px solid #bd985e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:29px;letter-spacing:1.3px;font-weight:800;white-space:nowrap;">
<span style="color:#ffffff;">AK</span><span style="color:#c9a366;"> PRIME</span></td>
<td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2.4px;line-height:1.7;color:#d3dfe9;">PERFORMANCE<br>PROGRESSION<br>ÉQUILIBRE</td>
</tr>
</table>
</td></tr>

<tr><td class="ak-pad" style="padding:40px 40px 28px;background:#ffffff;">
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2.5px;font-weight:700;color:#a7834d;">VOTRE ACCOMPAGNEMENT AK PRIME</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#53657a;">{{GREETING}}</p>
<h1 class="ak-hero" style="margin:0 0 15px;font-family:Arial,Helvetica,sans-serif;font-size:36px;line-height:1.18;letter-spacing:-1px;font-weight:800;color:#11283f;">{{HEADLINE}}</h1>
<p style="margin:0 0 27px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.8;color:#66778b;">{{LEAD}}</p>
<table role="presentation" cellspacing="0" cellpadding="0">
<tr><td style="border-radius:9px;background:#b48c50;">
<a class="ak-button" href="{{SITE_URL}}" style="display:inline-block;padding:15px 27px;background:#b48c50;border:1px solid #b48c50;border-radius:9px;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;line-height:1.5;">Accéder à mon espace &nbsp; &#8594;</a>
</td></tr></table>
</td></tr>

<tr><td class="ak-pad" style="padding:10px 40px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
{{CARDS}}
</table>
</td></tr>

<tr><td class="ak-pad" style="padding:0 40px 35px;">
<table role="presentation" width="100%" style="background:#f3f6f9;border-collapse:separate;border-radius:12px;" cellpadding="0" cellspacing="0">
<tr><td style="padding:17px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:#607287;">
<strong style="color:#213a52;">Vos informations restent privées.</strong><br>Consultez vos données personnelles et vos détails de suivi uniquement dans votre espace sécurisé AK PRIME.
</td></tr></table></td></tr>

<tr><td class="ak-pad" style="padding:24px 40px 28px;background:#11283f;">
<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:1.1px;color:#d1aa6c;">AK PRIME</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#c6d1db;">Une approche globale. Des résultats durables.</p>
<a href="{{SITE_URL}}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#e1e8ee;text-decoration:underline;">akprime.fr</a><span style="color:#5f788b;"> &nbsp;·&nbsp; </span>
<a href="mailto:contact@akprime.fr" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#e1e8ee;text-decoration:underline;">contact@akprime.fr</a>
<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;color:#93a8b8;">Notification liée à votre accompagnement AK PRIME. Ceci n’est pas une communication publicitaire.</p>
</td></tr>
</table></td></tr></table>
</body></html>
$mail$;
 html:=replace(html,'{{SUBJECT}}',private.ak_mail_escape(coalesce(p_subject,'Notification AK PRIME')));
 html:=replace(html,'{{PREHEADER}}',private.ak_mail_escape(headline));
 html:=replace(html,'{{GREETING}}',private.ak_mail_escape(greeting));
 html:=replace(html,'{{HEADLINE}}',private.ak_mail_escape(headline));
 html:=replace(html,'{{LEAD}}',private.ak_mail_escape(lead));
 html:=replace(html,'{{SITE_URL}}',private.ak_mail_escape(coalesce(p_site_url,'https://akprime.fr')));
 html:=replace(html,'{{CARDS}}',cards);
 return html;
end $function$;
revoke all on function private.notification_mail_html(text,jsonb,text,text) from public,anon,authenticated;

-- Transport Resend, objet explicite et regroupement des e-mails.
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
revoke all on function private.notification_mail_dispatch() from public,anon,authenticated;
