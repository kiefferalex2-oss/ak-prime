-- AK PRIME - délai minimum de 24 heures sur les visios réservées par les clients.
-- 3 lectures de créneaux + 3 actions de réservation / report protégées côté serveur.
CREATE OR REPLACE FUNCTION public.book_my_appointment(p_starts_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  cc record;
  appt_id uuid;
  local_date date;
  slot_ok boolean;
  used_count integer;
begin

  if exists(select 1 from public.clients p where p.auth_user_id=auth.uid()
    and p.archived_at is null and p.status='paused') then
    raise exception 'Ton accompagnement est en pause : contacte ton coach pour reprendre les réservations.';
  end if;
  select * into cc from private.current_client_booking_policy();

  if cc.client_id is null or cc.coach_id is null then
    raise exception 'Dossier client ou coach introuvable';
  end if;

  if p_starts_at is null or p_starts_at < now()+interval '24 hours' then
    raise exception 'La réservation doit être effectuée au moins 24 heures avant le début de la visio.';
  end if;
  local_date := (p_starts_at at time zone 'Europe/Paris')::date;

  perform pg_advisory_xact_lock(hashtext(cc.client_id::text));
  perform pg_advisory_xact_lock(hashtext(cc.coach_id::text));

  select count(*)
  into used_count
  from public.appointments mine
  where mine.client_id=cc.client_id
    and private.appointment_counts_for_quota(mine.status)
    and mine.appointment_type is distinct from 'Visio initiale'
    and (
      (cc.quota_period='week' and date_trunc('week',mine.starts_at at time zone 'Europe/Paris')=date_trunc('week',p_starts_at at time zone 'Europe/Paris'))
      or
      (cc.quota_period='month' and date_trunc('month',mine.starts_at at time zone 'Europe/Paris')=date_trunc('month',p_starts_at at time zone 'Europe/Paris'))
    );

  if used_count>=cc.quota_count then
    if cc.quota_period='week' then
      raise exception 'Ton offre autorise % visio(s) par semaine. Ton quota est déjà utilisé pour cette semaine.',cc.quota_count;
    else
      raise exception 'Ton offre autorise % visio(s) par mois. Ton quota est déjà utilisé pour ce mois.',cc.quota_count;
    end if;
  end if;

  select exists(
    select 1 from public.get_my_available_slots(local_date,local_date) s
    where s.starts_at=p_starts_at
  ) into slot_ok;

  if not slot_ok then raise exception 'Ce créneau n’est plus disponible'; end if;

  insert into public.appointments(client_id,coach_user_id,starts_at,duration_minutes,appointment_type,status)
  values(cc.client_id,cc.coach_id,p_starts_at,cc.duration_minutes,'Visio','scheduled')
  returning id into appt_id;

  insert into public.appointment_events(appointment_id,client_id,event_type,new_starts_at,detail)
  values(appt_id,cc.client_id,'booked',p_starts_at,'Visio réservée par le client.');

  update public.onboarding
  set visio_scheduled_at=coalesce(visio_scheduled_at,p_starts_at),updated_at=now()
  where client_id=cc.client_id and current_step='visio';

  return appt_id;
exception when unique_violation then
  raise exception 'Ce créneau vient d’être réservé par un autre client';
end;
$function$;

CREATE OR REPLACE FUNCTION public.book_my_initial_visio(p_starts_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
DECLARE
 cc record;
 v_client public.clients%rowtype;
 v_id uuid;
 v_date date;
 v_open boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.' USING errcode='42501'; END IF;
 SELECT c.* INTO v_client FROM public.clients c
 WHERE c.auth_user_id=auth.uid() AND c.portal_access_enabled AND c.archived_at IS NULL
 FOR UPDATE;
 IF v_client.id IS NULL THEN RAISE EXCEPTION 'Compte client non autorisé.' USING errcode='42501'; END IF;
 IF v_client.status IN ('paused','inactive') THEN RAISE EXCEPTION 'Ton dossier ne permet pas cette réservation.' USING errcode='42501'; END IF;
 SELECT * INTO cc FROM private.current_client_booking_policy();
 IF cc.client_id IS DISTINCT FROM v_client.id OR cc.coach_id IS NULL THEN
   RAISE EXCEPTION 'Calendrier coach indisponible.';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext(cc.client_id::text));
 PERFORM pg_advisory_xact_lock(hashtext(cc.coach_id::text));
 IF EXISTS (SELECT 1 FROM public.appointments a
   WHERE a.client_id=cc.client_id AND a.appointment_type='Visio initiale'
   AND a.status<>'cancelled')
 OR EXISTS (SELECT 1 FROM public.onboarding o WHERE o.client_id=cc.client_id AND o.visio_completed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Ta visio initiale est déjà réservée ou réalisée. Contacte ton coach pour toute nouvelle demande.';
 END IF;
 IF p_starts_at IS NULL OR p_starts_at < now()+interval '24 hours' THEN
   RAISE EXCEPTION 'La réservation doit être effectuée au moins 24 heures avant le début de la visio.';
 END IF;
 v_date := (p_starts_at at time zone 'Europe/Paris')::date;
 IF p_starts_at <= now() OR v_date < (now() at time zone 'Europe/Paris')::date
    OR v_date > (now() at time zone 'Europe/Paris')::date + 20 THEN
   RAISE EXCEPTION 'Choisis un créneau disponible dans les trois prochaines semaines.';
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.get_my_initial_visio_slots(v_date,v_date) sl
               WHERE sl.starts_at=p_starts_at) INTO v_open;
 IF NOT v_open THEN RAISE EXCEPTION 'Ce créneau vient de devenir indisponible, choisis-en un autre.'; END IF;
 INSERT INTO public.appointments(client_id,coach_user_id,starts_at,duration_minutes,appointment_type,status)
 VALUES(cc.client_id,cc.coach_id,p_starts_at,cc.duration_minutes,'Visio initiale','scheduled')
 RETURNING id INTO v_id;
 INSERT INTO public.appointment_events(appointment_id,client_id,event_type,new_starts_at,detail)
 VALUES(v_id,cc.client_id,'booked',p_starts_at,'Visio initiale réservée, hors quota mensuel/hebdomadaire.');
 INSERT INTO public.onboarding(client_id,visio_scheduled_at)
 VALUES(cc.client_id,p_starts_at)
 ON CONFLICT(client_id) DO UPDATE SET visio_scheduled_at=excluded.visio_scheduled_at,updated_at=now();
 RETURN v_id;
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'Une visio initiale existe déjà ou ce créneau vient d’être réservé.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_available_slots(p_from date, p_to date)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
with cc as (
  select * from private.current_client_booking_policy()
),
days as (
  select d::date slot_date from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d
),
date_mode as (
  select days.slot_date,
    exists(select 1 from public.availability_date_windows dw,cc where dw.coach_user_id=cc.coach_id and dw.availability_date=days.slot_date) has_date_override
  from days
),
windows as (
  select cc.client_id,cc.coach_id,cc.duration_minutes,cc.quota_period,cc.quota_count,
         dw.availability_date slot_date,dw.start_time,dw.end_time
  from cc
  join public.availability_date_windows dw on dw.coach_user_id=cc.coach_id
  where dw.availability_date between p_from and p_to
  union all
  select cc.client_id,cc.coach_id,cc.duration_minutes,cc.quota_period,cc.quota_count,
         days.slot_date,aw.start_time,aw.end_time
  from cc
  cross join days
  join date_mode dm on dm.slot_date=days.slot_date and dm.has_date_override=false
  join public.availability_windows aw
    on aw.coach_user_id=cc.coach_id and aw.active=true
   and aw.weekday=extract(isodow from days.slot_date)::integer
),
candidates as (
  select w.client_id,w.coach_id,w.duration_minutes,w.quota_period,w.quota_count,
         gs starts_at,gs+(w.duration_minutes*interval '1 minute') ends_at
  from windows w
  cross join lateral generate_series(
    (w.slot_date+w.start_time) at time zone 'Europe/Paris',
    ((w.slot_date+w.end_time) at time zone 'Europe/Paris')-(w.duration_minutes*interval '1 minute'),
    interval '30 minutes'
  ) gs
)
select c.starts_at,c.ends_at
from candidates c
where c.starts_at>=now()+interval '24 hours'
  and (
    select count(*) from public.appointments mine
    where mine.client_id=c.client_id
      and private.appointment_counts_for_quota(mine.status)
      and mine.appointment_type is distinct from 'Visio initiale'
      and (
        (c.quota_period='week' and date_trunc('week',mine.starts_at at time zone 'Europe/Paris')=date_trunc('week',c.starts_at at time zone 'Europe/Paris'))
        or
        (c.quota_period='month' and date_trunc('month',mine.starts_at at time zone 'Europe/Paris')=date_trunc('month',c.starts_at at time zone 'Europe/Paris'))
      )
  )<c.quota_count
  and not exists(
    select 1 from public.availability_exceptions e
    where e.coach_user_id=c.coach_id and e.kind='unavailable'
      and (c.starts_at at time zone 'Europe/Paris')::date between e.exception_date and e.end_date
      and (
        (e.start_time is null and e.end_time is null)
        or ((c.starts_at at time zone 'Europe/Paris')::time<e.end_time and (c.ends_at at time zone 'Europe/Paris')::time>e.start_time)
      )
  )
  and not exists(
    select 1 from public.appointments a
    where a.coach_user_id=c.coach_id and a.status in ('scheduled','confirmed')
      and a.starts_at<c.ends_at
      and (a.starts_at+(a.duration_minutes*interval '1 minute'))>c.starts_at
  )
order by c.starts_at;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_initial_visio_slots(p_from date, p_to date)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
with cc as (
  select * from private.current_client_booking_policy()
),
days as (
  select d::date slot_date from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d
),
date_mode as (
  select days.slot_date,
    exists(select 1 from public.availability_date_windows dw,cc where dw.coach_user_id=cc.coach_id and dw.availability_date=days.slot_date) has_date_override
  from days
),
windows as (
  select cc.client_id,cc.coach_id,cc.duration_minutes,cc.quota_period,cc.quota_count,
         dw.availability_date slot_date,dw.start_time,dw.end_time
  from cc
  join public.availability_date_windows dw on dw.coach_user_id=cc.coach_id
  where dw.availability_date between p_from and p_to
  union all
  select cc.client_id,cc.coach_id,cc.duration_minutes,cc.quota_period,cc.quota_count,
         days.slot_date,aw.start_time,aw.end_time
  from cc
  cross join days
  join date_mode dm on dm.slot_date=days.slot_date and dm.has_date_override=false
  join public.availability_windows aw
    on aw.coach_user_id=cc.coach_id and aw.active=true
   and aw.weekday=extract(isodow from days.slot_date)::integer
),
candidates as (
  select w.client_id,w.coach_id,w.duration_minutes,w.quota_period,w.quota_count,
         gs starts_at,gs+(w.duration_minutes*interval '1 minute') ends_at
  from windows w
  cross join lateral generate_series(
    (w.slot_date+w.start_time) at time zone 'Europe/Paris',
    ((w.slot_date+w.end_time) at time zone 'Europe/Paris')-(w.duration_minutes*interval '1 minute'),
    interval '30 minutes'
  ) gs
)
select c.starts_at,c.ends_at
from candidates c
where c.starts_at>=now()+interval '24 hours'
  and p_from >= (now() at time zone 'Europe/Paris')::date
  and p_to >= p_from and p_to <= (now() at time zone 'Europe/Paris')::date + 20
  and exists(select 1 from public.clients mine where mine.id=c.client_id and mine.auth_user_id=auth.uid()
    and mine.portal_access_enabled and mine.archived_at is null and mine.status not in ('paused','inactive'))
  and not exists(
    select 1 from public.availability_exceptions e
    where e.coach_user_id=c.coach_id and e.kind='unavailable'
      and (c.starts_at at time zone 'Europe/Paris')::date between e.exception_date and e.end_date
      and (
        (e.start_time is null and e.end_time is null)
        or ((c.starts_at at time zone 'Europe/Paris')::time<e.end_time and (c.ends_at at time zone 'Europe/Paris')::time>e.start_time)
      )
  )
  and not exists(
    select 1 from public.appointments a
    where a.coach_user_id=c.coach_id and a.status in ('scheduled','confirmed')
      and a.starts_at<c.ends_at
      and (a.starts_at+(a.duration_minutes*interval '1 minute'))>c.starts_at
  )
order by c.starts_at;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_reschedule_slots(p_appointment_id uuid, p_from date, p_to date)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
with cc as (
  select * from private.current_client_booking_policy()
),
target as (
  select a.*
  from public.appointments a
  join cc on cc.client_id=a.client_id
  where a.id=p_appointment_id
    and a.status in ('scheduled','confirmed')
    and a.starts_at>now()+interval '24 hours'
),
days as (
  select d::date slot_date from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d
),
date_mode as (
  select days.slot_date,
    exists(select 1 from public.availability_date_windows dw,cc where dw.coach_user_id=cc.coach_id and dw.availability_date=days.slot_date) has_date_override
  from days
),
windows as (
  select cc.client_id,cc.coach_id,cc.duration_minutes,cc.quota_period,cc.quota_count,
         dw.availability_date slot_date,dw.start_time,dw.end_time
  from cc
  join target on true
  join public.availability_date_windows dw on dw.coach_user_id=cc.coach_id
  where dw.availability_date between p_from and p_to
  union all
  select cc.client_id,cc.coach_id,cc.duration_minutes,cc.quota_period,cc.quota_count,
         days.slot_date,aw.start_time,aw.end_time
  from cc
  join target on true
  cross join days
  join date_mode dm on dm.slot_date=days.slot_date and dm.has_date_override=false
  join public.availability_windows aw
    on aw.coach_user_id=cc.coach_id and aw.active=true
   and aw.weekday=extract(isodow from days.slot_date)::integer
),
candidates as (
  select w.client_id,w.coach_id,w.duration_minutes,w.quota_period,w.quota_count,
         gs starts_at,gs+(w.duration_minutes*interval '1 minute') ends_at
  from windows w
  cross join lateral generate_series(
    (w.slot_date+w.start_time) at time zone 'Europe/Paris',
    ((w.slot_date+w.end_time) at time zone 'Europe/Paris')-(w.duration_minutes*interval '1 minute'),
    interval '30 minutes'
  ) gs
)
select c.starts_at,c.ends_at
from candidates c
where c.starts_at>=now()+interval '24 hours'
  and ((select t.appointment_type from target t limit 1) = 'Visio initiale' or (
    select count(*) from public.appointments mine
    where mine.client_id=c.client_id
      and mine.id<>p_appointment_id
      and private.appointment_counts_for_quota(mine.status)
      and mine.appointment_type is distinct from 'Visio initiale'
      and (
        (c.quota_period='week' and date_trunc('week',mine.starts_at at time zone 'Europe/Paris')=date_trunc('week',c.starts_at at time zone 'Europe/Paris'))
        or
        (c.quota_period='month' and date_trunc('month',mine.starts_at at time zone 'Europe/Paris')=date_trunc('month',c.starts_at at time zone 'Europe/Paris'))
      )
  )<c.quota_count)
  and not exists(
    select 1 from public.availability_exceptions e
    where e.coach_user_id=c.coach_id and e.kind='unavailable'
      and (c.starts_at at time zone 'Europe/Paris')::date between e.exception_date and e.end_date
      and (
        (e.start_time is null and e.end_time is null)
        or ((c.starts_at at time zone 'Europe/Paris')::time<e.end_time and (c.ends_at at time zone 'Europe/Paris')::time>e.start_time)
      )
  )
  and not exists(
    select 1 from public.appointments a
    where a.coach_user_id=c.coach_id
      and a.id<>p_appointment_id
      and a.status in ('scheduled','confirmed')
      and a.starts_at<c.ends_at
      and (a.starts_at+(a.duration_minutes*interval '1 minute'))>c.starts_at
  )
order by c.starts_at;
$function$;

CREATE OR REPLACE FUNCTION public.reschedule_my_appointment(p_appointment_id uuid, p_new_starts_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare cc record;a public.appointments%rowtype;slot_ok boolean;new_date date;
begin

  if exists(select 1 from public.clients p where p.auth_user_id=auth.uid()
    and p.archived_at is null and p.status='paused') then
    raise exception 'Ton accompagnement est en pause : contacte ton coach pour reprendre les réservations.';
  end if;
  select * into cc from private.current_client_booking_policy();
  select * into a from public.appointments where id=p_appointment_id and client_id=cc.client_id for update;
  if a.id is null then raise exception 'Rendez-vous introuvable'; end if;
  if a.status not in ('scheduled','confirmed') then raise exception 'Ce rendez-vous ne peut plus être déplacé'; end if;
  if a.starts_at<now()+interval '24 hours' then
    raise exception 'À moins de 24 h, la visio ne peut plus être déplacée automatiquement. Contacte Alex sur WhatsApp.';
  end if;

  perform pg_advisory_xact_lock(hashtext(cc.client_id::text));
  perform pg_advisory_xact_lock(hashtext(cc.coach_id::text));

  if p_new_starts_at is null or p_new_starts_at < now()+interval '24 hours' then
    raise exception 'Le nouveau créneau doit commencer au moins 24 heures après la demande de report.';
  end if;
  new_date:=(p_new_starts_at at time zone 'Europe/Paris')::date;
  select exists(select 1 from public.get_my_reschedule_slots(a.id,new_date,new_date) s where s.starts_at=p_new_starts_at) into slot_ok;
  if not slot_ok then raise exception 'Ce créneau n’est plus disponible ou dépasse ton quota'; end if;

  update public.appointments set starts_at=p_new_starts_at,rescheduled_at=now(),status='scheduled' where id=a.id;
  insert into public.appointment_events(appointment_id,client_id,event_type,old_starts_at,new_starts_at,detail)
  values(a.id,a.client_id,'rescheduled',a.starts_at,p_new_starts_at,'Déplacement effectué par le client à plus de 24 h.');
  return a.id;
exception when unique_violation then
  raise exception 'Ce créneau vient d’être réservé par un autre client';
end;
$function$;
