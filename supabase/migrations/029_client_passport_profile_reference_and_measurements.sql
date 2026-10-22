-- AK PRIME : Passeport athlète — profil complété, repères de charge/Hooper et évolutions.
-- Les données de santé et d'accompagnement restent privées et accessibles par RLS.
create table if not exists public.client_passport_profiles (
 client_id uuid primary key references public.clients(id) on delete cascade,
 profile_overrides jsonb not null default '{}'::jsonb,
 reference_stats jsonb not null default '{}'::jsonb,
 weight_history jsonb not null default '[]'::jsonb,
 nutrition_history jsonb not null default '[]'::jsonb,
 sleep_reference jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 constraint akp_passport_overrides_object check (jsonb_typeof(profile_overrides)='object'),
 constraint akp_passport_stats_object check (jsonb_typeof(reference_stats)='object'),
 constraint akp_passport_weights_array check (jsonb_typeof(weight_history)='array'),
 constraint akp_passport_nutrition_array check (jsonb_typeof(nutrition_history)='array'),
 constraint akp_passport_sleep_object check (jsonb_typeof(sleep_reference)='object'),
 constraint akp_passport_size_limit check (
  pg_column_size(profile_overrides)<65536
  and pg_column_size(weight_history)<65536
  and pg_column_size(nutrition_history)<65536)
);
alter table public.client_passport_profiles enable row level security;
drop policy if exists akp_passport_profile_read on public.client_passport_profiles;
create policy akp_passport_profile_read on public.client_passport_profiles
 for select to authenticated using ((select private.can_access_client(client_id)));
drop policy if exists akp_passport_profile_coach_insert on public.client_passport_profiles;
create policy akp_passport_profile_coach_insert on public.client_passport_profiles
 for insert to authenticated
 with check ((select private.is_coach()) and updated_by=(select auth.uid()));
drop policy if exists akp_passport_profile_coach_update on public.client_passport_profiles;
create policy akp_passport_profile_coach_update on public.client_passport_profiles
 for update to authenticated using ((select private.is_coach()))
 with check ((select private.is_coach()) and updated_by=(select auth.uid()));
revoke all on public.client_passport_profiles from anon;
grant select,insert,update on public.client_passport_profiles to authenticated;
grant all on public.client_passport_profiles to service_role;
