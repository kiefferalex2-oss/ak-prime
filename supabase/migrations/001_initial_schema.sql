-- AK PRIME — schéma initial Supabase
-- V1 : un dossier client unique, historique long terme et séparation coach/client.
-- IMPORTANT : appliquer ce fichier uniquement dans un projet Supabase dédié à AK PRIME.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('owner','coach','client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.client_status as enum ('prospect','onboarding','active','paused','inactive');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.visibility_level as enum ('coach_private','client_visible');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'client',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  birth_date date,
  legal_guardian text,
  current_pole text,
  current_offer text,
  status public.client_status not null default 'prospect',
  current_sport text,
  position_or_specialty text,
  level text,
  start_date date,
  engagement_end_date date,
  next_visio_at timestamptz,
  optitrainer_url text,
  admin_note text,
  payment_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  assignment_role text not null default 'coach',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(client_id, coach_user_id)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  pole text not null,
  offer text not null,
  commitment_months integer check (commitment_months in (1,3,6)),
  start_date date not null,
  end_date date,
  payment_mode text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding (
  client_id uuid primary key references public.clients(id) on delete cascade,
  questionnaire_received_at timestamptz,
  visio_scheduled_at timestamptz,
  visio_completed_at timestamptz,
  tests_required jsonb not null default '[]'::jsonb,
  tests_completed_at timestamptz,
  programming_ready_at timestamptz,
  onboarding_completed_at timestamptz,
  current_step text not null default 'questionnaire',
  updated_at timestamptz not null default now()
);

create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  questionnaire_type text not null,
  questionnaire_version integer not null default 1,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.visio_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  questionnaire_response_id uuid references public.questionnaire_responses(id) on delete set null,
  linked_question_key text,
  note text not null,
  visibility public.visibility_level not null default 'coach_private',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_preferences (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category text not null,
  label text not null,
  details text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  test_name text not null,
  performed_at timestamptz not null,
  result_value numeric,
  result_text text,
  unit text,
  protocol text,
  context text,
  video_url text,
  coach_interpretation text,
  include_in_passport boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tests_client_test_date_idx
  on public.tests(client_id, test_name, performed_at desc);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date,
  priorities text,
  vigilance text,
  outcome_summary text,
  status text not null default 'planned',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  week_date date not null,
  overall_week text,
  missed_sessions text,
  exercise_problem text,
  pain_or_discomfort text,
  next_week_constraints text,
  other_info text,
  coach_feedback text,
  coach_decision text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.passport_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  event_date date not null,
  event_type text,
  title text not null,
  detail text,
  client_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null default 30,
  appointment_type text,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);

-- updated_at générique
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger visio_notes_set_updated_at before update on public.visio_notes
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger cycles_set_updated_at before update on public.cycles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger coach_notes_set_updated_at before update on public.coach_notes
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger onboarding_set_updated_at before update on public.onboarding
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Chaque nouvel utilisateur Auth reçoit un profil CLIENT par défaut.
-- Le rôle owner/coach doit être attribué explicitement côté admin, jamais depuis le navigateur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, role, full_name)
  values (new.id, 'client', coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Fonctions d'autorisation.
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','coach')
  );
$$;

create or replace function public.can_access_client(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.clients
      where id = target_client and auth_user_id = auth.uid()
    )
    or exists (
      select 1 from public.coach_client_assignments
      where client_id = target_client
        and coach_user_id = auth.uid()
        and active = true
    )
    or public.is_coach();
$$;

-- RLS activée partout.
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.coach_client_assignments enable row level security;
alter table public.enrollments enable row level security;
alter table public.onboarding enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.visio_notes enable row level security;
alter table public.client_preferences enable row level security;
alter table public.tests enable row level security;
alter table public.cycles enable row level security;
alter table public.checkins enable row level security;
alter table public.passport_events enable row level security;
alter table public.coach_notes enable row level security;
alter table public.appointments enable row level security;

-- Profils
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
for select using (id = auth.uid() or public.is_coach());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

-- Clients : lecture client lui-même / coach.
drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients
for select using (public.can_access_client(id));

drop policy if exists clients_coach_insert on public.clients;
create policy clients_coach_insert on public.clients
for insert with check (public.is_coach());

drop policy if exists clients_coach_update on public.clients;
create policy clients_coach_update on public.clients
for update using (public.is_coach())
with check (public.is_coach());

-- Assignations réservées coach.
drop policy if exists assignments_coach_all on public.coach_client_assignments;
create policy assignments_coach_all on public.coach_client_assignments
for all using (public.is_coach())
with check (public.is_coach());

-- Tables dossier : lecture si accès client, écriture coach.
drop policy if exists enrollments_read on public.enrollments;
create policy enrollments_read on public.enrollments for select using (public.can_access_client(client_id));
drop policy if exists enrollments_write on public.enrollments;
create policy enrollments_write on public.enrollments for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists onboarding_read on public.onboarding;
create policy onboarding_read on public.onboarding for select using (public.can_access_client(client_id));
drop policy if exists onboarding_write on public.onboarding;
create policy onboarding_write on public.onboarding for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists questionnaire_read on public.questionnaire_responses;
create policy questionnaire_read on public.questionnaire_responses for select using (public.can_access_client(client_id));
drop policy if exists questionnaire_client_insert on public.questionnaire_responses;
create policy questionnaire_client_insert on public.questionnaire_responses
for insert with check (public.can_access_client(client_id));
drop policy if exists questionnaire_coach_update on public.questionnaire_responses;
create policy questionnaire_coach_update on public.questionnaire_responses
for update using (public.is_coach()) with check (public.is_coach());

drop policy if exists visio_notes_coach_all on public.visio_notes;
create policy visio_notes_coach_all on public.visio_notes
for all using (public.is_coach()) with check (public.is_coach());
drop policy if exists visio_notes_client_read on public.visio_notes;
create policy visio_notes_client_read on public.visio_notes
for select using (visibility = 'client_visible' and public.can_access_client(client_id));

drop policy if exists preferences_read on public.client_preferences;
create policy preferences_read on public.client_preferences for select using (public.can_access_client(client_id));
drop policy if exists preferences_write on public.client_preferences;
create policy preferences_write on public.client_preferences for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists tests_read on public.tests;
create policy tests_read on public.tests for select using (public.can_access_client(client_id));
drop policy if exists tests_write on public.tests;
create policy tests_write on public.tests for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists cycles_read on public.cycles;
create policy cycles_read on public.cycles for select using (public.can_access_client(client_id));
drop policy if exists cycles_write on public.cycles;
create policy cycles_write on public.cycles for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins for select using (public.can_access_client(client_id));
drop policy if exists checkins_client_insert on public.checkins;
create policy checkins_client_insert on public.checkins
for insert with check (public.can_access_client(client_id));
drop policy if exists checkins_coach_update on public.checkins;
create policy checkins_coach_update on public.checkins
for update using (public.is_coach()) with check (public.is_coach());

drop policy if exists passport_events_read on public.passport_events;
create policy passport_events_read on public.passport_events
for select using (public.is_coach() or (client_visible and public.can_access_client(client_id)));
drop policy if exists passport_events_write on public.passport_events;
create policy passport_events_write on public.passport_events
for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists coach_notes_all on public.coach_notes;
create policy coach_notes_all on public.coach_notes
for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists appointments_read on public.appointments;
create policy appointments_read on public.appointments
for select using (public.can_access_client(client_id));
drop policy if exists appointments_write on public.appointments;
create policy appointments_write on public.appointments
for all using (public.is_coach()) with check (public.is_coach());

-- Index principaux
create index if not exists clients_auth_user_idx on public.clients(auth_user_id);
create index if not exists assignments_coach_idx on public.coach_client_assignments(coach_user_id, active);
create index if not exists questionnaire_client_idx on public.questionnaire_responses(client_id, submitted_at desc);
create index if not exists cycles_client_idx on public.cycles(client_id, start_date desc);
create index if not exists checkins_client_idx on public.checkins(client_id, week_date desc);
create index if not exists passport_events_client_idx on public.passport_events(client_id, event_date desc);
create index if not exists appointments_client_idx on public.appointments(client_id, starts_at);
