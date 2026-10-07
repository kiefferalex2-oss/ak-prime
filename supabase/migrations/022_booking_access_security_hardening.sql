-- AK PRIME — durcissement sécurité réservation / helpers
-- Cette migration documente la correction appliquée manuellement dans Supabase
-- puis retire les droits d'exécution inutiles sur certains helpers.

create or replace function private.current_client_and_coach()
returns table(
  client_id uuid,
  coach_id uuid,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = public, private
as $function$
  with me as (
    select
      c.id as client_id,
      case when c.current_pole = 'Mental' then 45 else 30 end as duration_minutes
    from public.clients c
    where c.auth_user_id = auth.uid()
      and c.portal_access_enabled = true
    limit 1
  ),
  assigned as (
    select a.coach_user_id
    from public.coach_client_assignments a
    join me on me.client_id = a.client_id
    where a.active = true
    order by a.created_at asc
    limit 1
  ),
  fallback as (
    select p.id
    from public.profiles p
    where p.role = 'owner'
    order by p.created_at asc
    limit 1
  )
  select
    me.client_id,
    coalesce((select coach_user_id from assigned), (select id from fallback)) as coach_id,
    me.duration_minutes
  from me;
$function$;

create or replace function private.current_client_booking_policy()
returns table(
  client_id uuid,
  coach_id uuid,
  duration_minutes integer,
  quota_period text,
  quota_count integer,
  offer_label text
)
language sql
stable
security definer
set search_path = public, private
as $function$
  with me as (
    select
      c.id as client_id,
      c.current_offer,
      c.current_pole,
      case when c.current_pole = 'Mental' then 45 else 30 end as duration_minutes
    from public.clients c
    where c.auth_user_id = auth.uid()
      and c.portal_access_enabled = true
    limit 1
  ),
  assigned as (
    select a.coach_user_id
    from public.coach_client_assignments a
    join me on me.client_id = a.client_id
    where a.active = true
    order by a.created_at asc
    limit 1
  ),
  fallback as (
    select p.id
    from public.profiles p
    where p.role = 'owner'
    order by p.created_at asc
    limit 1
  )
  select
    me.client_id,
    coalesce((select coach_user_id from assigned), (select id from fallback)) as coach_id,
    me.duration_minutes,
    case
      when lower(coalesce(me.current_offer,'')) like '%mental%'
       and (
         lower(coalesce(me.current_offer,'')) like '%p1%'
         or lower(coalesce(me.current_offer,'')) like '%p2%'
         or lower(coalesce(me.current_offer,'')) like '%p3%'
         or lower(coalesce(me.current_offer,'')) like '%standard%'
         or lower(coalesce(me.current_offer,'')) like '%renforc%'
         or lower(coalesce(me.current_offer,'')) like '%forme%'
       ) then 'month'
      when lower(coalesce(me.current_offer,'')) like '%mental%' then 'week'
      when lower(coalesce(me.current_offer,'')) like '%p3%' then 'week'
      else 'month'
    end as quota_period,
    case
      when lower(coalesce(me.current_offer,'')) like '%mental%'
       and (
         lower(coalesce(me.current_offer,'')) like '%p1%'
         or lower(coalesce(me.current_offer,'')) like '%p2%'
         or lower(coalesce(me.current_offer,'')) like '%p3%'
         or lower(coalesce(me.current_offer,'')) like '%standard%'
         or lower(coalesce(me.current_offer,'')) like '%renforc%'
         or lower(coalesce(me.current_offer,'')) like '%forme%'
       ) then 4
      when lower(coalesce(me.current_offer,'')) like '%mental%' then 1
      when lower(coalesce(me.current_offer,'')) like '%p3%' then 1
      when lower(coalesce(me.current_offer,'')) like '%p2%' then 2
      when lower(coalesce(me.current_offer,'')) like '%renforc%' then 2
      when lower(coalesce(me.current_offer,'')) like '%p1%' then 1
      when lower(coalesce(me.current_offer,'')) like '%standard%' then 1
      else 1
    end as quota_count,
    coalesce(me.current_offer,'') as offer_label
  from me;
$function$;

revoke execute on function private.current_client_and_coach() from public, anon, authenticated;
revoke execute on function private.current_client_booking_policy() from public, anon, authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function private.appointment_counts_for_quota(text) from public, anon, authenticated;
