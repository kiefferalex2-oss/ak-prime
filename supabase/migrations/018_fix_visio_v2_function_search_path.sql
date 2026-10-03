-- AK PRIME — sécurité Visios V2
create or replace function private.appointment_counts_for_quota(p_status text)
returns boolean
language sql
immutable
set search_path = private
as $$
  select p_status in ('scheduled','confirmed','completed','cancelled_late','no_show');
$$;

revoke execute on function private.appointment_counts_for_quota(text) from public, anon;
grant execute on function private.appointment_counts_for_quota(text) to authenticated, service_role;
