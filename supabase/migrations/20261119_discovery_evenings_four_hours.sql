-- AK PRIME : bilans offerts en soirée (18h, 18h30, 19h, 19h30, 20h), préavis minimal 4 heures.
-- Les réservations des clients déjà inscrits conservent leurs règles actuelles.
-- Respect des indisponibilités et des collisions entre rendez-vous.

CREATE OR REPLACE FUNCTION public.akp_discovery_slots(p_from date, p_to date)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
WITH coach AS (
 SELECT id AS coach_id FROM public.profiles WHERE role::text='owner' ORDER BY created_at LIMIT 1
),
days AS (
 SELECT g::date AS slot_date
 FROM generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') g
 WHERE p_from >= (now() AT TIME ZONE 'Europe/Paris')::date
   AND p_to>=p_from AND p_to<=(now() AT TIME ZONE 'Europe/Paris')::date+20
),
windows AS (
 SELECT c.coach_id,dw.availability_date AS slot_date,dw.start_time,dw.end_time
 FROM coach c JOIN public.availability_date_windows dw ON dw.coach_user_id=c.coach_id
 WHERE dw.availability_date BETWEEN p_from AND p_to
 AND EXISTS(SELECT 1 FROM days d WHERE d.slot_date=dw.availability_date)
 UNION ALL
 SELECT c.coach_id,d.slot_date,aw.start_time,aw.end_time
 FROM coach c CROSS JOIN days d
 JOIN public.availability_windows aw ON aw.coach_user_id=c.coach_id AND aw.active
   AND aw.weekday=extract(isodow from d.slot_date)::integer
 WHERE NOT EXISTS (
  SELECT 1 FROM public.availability_date_windows dw
  WHERE dw.coach_user_id=c.coach_id AND dw.availability_date=d.slot_date
 )
 UNION ALL
 -- Plages du soir exclusivement pour les bilans publics.
 -- Les jours actifs et les exceptions du calendrier coach sont respectés.
 SELECT c.coach_id,d.slot_date,time '18:00',time '20:20'
 FROM coach c CROSS JOIN days d
 JOIN public.availability_windows aw ON aw.coach_user_id=c.coach_id AND aw.active
  AND aw.weekday=extract(isodow from d.slot_date)::integer
 WHERE NOT EXISTS (
  SELECT 1 FROM public.availability_date_windows dw
  WHERE dw.coach_user_id=c.coach_id AND dw.availability_date=d.slot_date
 )

),
candidates AS (
 SELECT w.coach_id,g AS starts_at,g+interval '20 minutes' AS ends_at
 FROM windows w CROSS JOIN LATERAL generate_series(
  (w.slot_date+w.start_time) AT TIME ZONE 'Europe/Paris',
  ((w.slot_date+w.end_time) AT TIME ZONE 'Europe/Paris')-interval '20 minutes',
  interval '30 minutes'
 ) g
)
SELECT DISTINCT c.starts_at,c.ends_at FROM candidates c
WHERE c.starts_at>=now()+interval '4 hours'
 AND NOT EXISTS (
  SELECT 1 FROM public.availability_exceptions e
  WHERE e.coach_user_id=c.coach_id AND e.kind='unavailable'
   AND (c.starts_at AT TIME ZONE 'Europe/Paris')::date BETWEEN e.exception_date AND e.end_date
   AND ((e.start_time IS NULL AND e.end_time IS NULL)
    OR ((c.starts_at AT TIME ZONE 'Europe/Paris')::time<e.end_time
    AND (c.ends_at AT TIME ZONE 'Europe/Paris')::time>e.start_time))
 )
 AND NOT EXISTS(
  SELECT 1 FROM public.appointments a
  WHERE a.coach_user_id=c.coach_id AND a.status IN ('scheduled','confirmed')
   AND a.starts_at<c.ends_at
   AND a.starts_at+(a.duration_minutes*interval '1 minute')>c.starts_at
 )
 AND NOT EXISTS(
  SELECT 1 FROM public.akp_discovery_bookings b
  WHERE b.coach_user_id=c.coach_id AND b.status='scheduled'
   AND b.starts_at<c.ends_at
   AND b.starts_at+interval '20 minutes'>c.starts_at
 )
ORDER BY starts_at;
$function$
;

CREATE OR REPLACE FUNCTION public.akp_book_discovery_call(p_starts_at timestamp with time zone, p_name text, p_email text, p_goal text, p_ip_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid; v_date date; v_id uuid; v_email text:=lower(btrim(p_email)); v_name text:=btrim(p_name);
BEGIN
 SELECT id INTO v_coach FROM public.profiles WHERE role::text='owner' ORDER BY created_at LIMIT 1;
 IF v_coach IS NULL THEN RAISE EXCEPTION 'Calendrier coach indisponible.'; END IF;
 IF p_starts_at IS NULL OR p_starts_at<now()+interval '4 hours'
   OR p_starts_at>now()+interval '21 days'
 THEN RAISE EXCEPTION 'Ce créneau est indisponible.'; END IF;
 IF length(v_name) NOT BETWEEN 2 AND 120 OR length(v_email) NOT BETWEEN 5 AND 254
   OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   OR length(coalesce(p_goal,''))>600
   OR p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'Informations incorrectes.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(v_coach::text));
 IF EXISTS(
  SELECT 1 FROM public.akp_discovery_bookings b
  WHERE lower(b.email)=v_email AND b.status='scheduled' AND b.starts_at>now()
 ) THEN RAISE EXCEPTION 'Un bilan est déjà réservé pour cette adresse e-mail.'; END IF;
 IF (SELECT count(*) FROM public.akp_discovery_bookings b
  WHERE b.ip_hash=p_ip_hash AND b.created_at>now()-interval '24 hours')>=3
 THEN RAISE EXCEPTION 'Trop de réservations depuis cette connexion.'; END IF;
 v_date:=(p_starts_at AT TIME ZONE 'Europe/Paris')::date;
 IF NOT EXISTS(SELECT 1 FROM public.akp_discovery_slots(v_date,v_date) s WHERE s.starts_at=p_starts_at)
 THEN RAISE EXCEPTION 'Ce créneau vient de devenir indisponible.'; END IF;
 INSERT INTO public.akp_discovery_bookings(coach_user_id,starts_at,full_name,email,goal,ip_hash)
 VALUES(v_coach,p_starts_at,v_name,v_email,coalesce(btrim(p_goal),''),
        p_ip_hash)
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$
;
