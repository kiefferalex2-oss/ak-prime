-- AK PRIME — verrouillage de l'accès client avant activation/paiement
alter table public.clients
  add column if not exists portal_access_enabled boolean not null default false;

-- Préserve les comptes déjà reliés pendant la bêta privée.
update public.clients
set portal_access_enabled = true
where auth_user_id is not null
  and portal_access_enabled = false;

create or replace function private.can_access_client(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $function$
  select
    exists (
      select 1
      from public.clients
      where id = target_client
        and auth_user_id = auth.uid()
        and portal_access_enabled = true
    )
    or exists (
      select 1
      from public.coach_client_assignments
      where client_id = target_client
        and coach_user_id = auth.uid()
        and active = true
    )
    or private.is_coach();
$function$;
