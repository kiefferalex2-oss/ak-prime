-- AK PRIME — disponibilités datées sur 3 semaines

create table if not exists public.availability_date_windows (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  availability_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists availability_date_windows_coach_date_idx
  on public.availability_date_windows(coach_user_id, availability_date, start_time);

alter table public.availability_date_windows enable row level security;
revoke all on public.availability_date_windows from anon;
grant select, insert, update, delete on public.availability_date_windows to authenticated, service_role;

drop policy if exists availability_date_windows_coach_all on public.availability_date_windows;
create policy availability_date_windows_coach_all on public.availability_date_windows
for all to authenticated
using (private.is_coach() and coach_user_id = auth.uid())
with check (private.is_coach() and coach_user_id = auth.uid());

-- Les disponibilités datées remplacent le planning hebdomadaire pour la date concernée.
-- get_my_available_slots a été mis à jour en conséquence et reste synchronisé
-- avec appointments / availability_exceptions via calendar_version.
