-- Garder visible tout incident de tâche durant les 24 heures suivant un échec.
create or replace function public.owner_email_system_health()
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare
 result jsonb;
begin
 if auth.uid() is null or not exists(
   select 1 from public.profiles where id=auth.uid() and role='owner'
 ) then
   raise exception 'Accès réservé au propriétaire' using errcode='42501';
 end if;
 select jsonb_build_object(
   'checked_at',now(),
   'provider_delivery_verified',false,
   'provider_delivery_note','Resend : envoi accepté ≠ livraison confirmée. Webhook email.delivered/failed/bounced à configurer.',
   'cron_errors_24h',(select count(*) from cron.job_run_details d
    join cron.job j on j.jobid=d.jobid
    where d.start_time>=now()-interval '24 hours'
      and d.status='failed'
      and j.jobname in ('akprime-notification-mails','akprime-coach-new-client-mails','akprime-sleep-weekly-reminders')),
   'jobs',coalesce((
      select jsonb_agg(jsonb_build_object(
       'name',j.jobname,
       'active',j.active,
       'last_status',coalesce(last_run.status,'never'),
       'last_at',last_run.start_time,
       'last_error',case when last_run.status='failed' then left(last_run.return_message,220) else null end
      ) order by j.jobname)
      from cron.job j
      left join lateral(
       select d.status,d.start_time,d.return_message from cron.job_run_details d
       where d.jobid=j.jobid order by d.start_time desc limit 1
      ) last_run on true
      where j.jobname in ('akprime-notification-mails','akprime-coach-new-client-mails','akprime-sleep-weekly-reminders')
   ),'[]'::jsonb),
   'notification_failed',(select count(*) from private.notification_mail_batches where status='failed'),
   'notification_waiting',(select count(*) from private.notification_mail_batches where status in ('pending','sending')),
   'new_client_failed',(select count(*) from private.coach_new_client_mail_outbox where status='failed'),
   'new_client_waiting',(select count(*) from private.coach_new_client_mail_outbox where status in ('pending','sending')),
   'reminder_failed',(select count(*) from private.ak_client_reminder_delivery where status='failed'),
   'reminder_waiting',(select count(*) from private.ak_client_reminder_delivery where status in ('pending','sending')),
   'reminder_accepted_by_provider',(select count(*) from private.ak_client_reminder_delivery where status='sent')
 ) into result;
 return result;
end
$fn$;
revoke all on function public.owner_email_system_health() from public,anon,authenticated;
grant execute on function public.owner_email_system_health() to authenticated;