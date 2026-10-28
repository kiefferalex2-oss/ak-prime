-- Éviter les doubles rappels du bilan le vendredi (18h + 20h).
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
 -- Bilans hebdomadaires : pris en charge par le cron dédié à 20h Europe/Paris.
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
end $function$
