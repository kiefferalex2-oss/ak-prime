-- AK PRIME / 027
-- Commentaires de visio sur les réponses du questionnaire, comptes rendus de visios et actions.
-- Également appliquée au projet Supabase de production le 21 octobre 2026.
alter table public.client_workspace
 add column if not exists focus_comments jsonb not null default '{}'::jsonb;

create table if not exists public.client_visio_notes (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete cascade,
 appointment_id uuid references public.appointments(id) on delete set null,
 session_date date not null default current_date,
 session_type text not null default 'followup' check(session_type in ('initial','followup','other')),
 title text not null check(length(btrim(title)) between 2 and 160),
 objectives text not null default '',
 working text not null default '',
 difficulties text not null default '',
 decisions text not null default '',
 next_session text not null default '',
 status text not null default 'draft' check(status in ('draft','completed')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint client_visio_notes_text_limit check (
   length(objectives)<=6000 and length(working)<=6000
   and length(difficulties)<=6000 and length(decisions)<=6000
   and length(next_session)<=6000
 )
);
create unique index if not exists client_visio_notes_appointment_unique
 on public.client_visio_notes(appointment_id) where appointment_id is not null;
create index if not exists client_visio_notes_client_date_idx
 on public.client_visio_notes(client_id,session_date desc);

create table if not exists public.client_followup_tasks (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete cascade,
 visio_note_id uuid references public.client_visio_notes(id) on delete set null,
 title text not null check(length(btrim(title)) between 2 and 240),
 detail text not null default '' check(length(detail)<=5000),
 due_date date,
 status text not null default 'todo' check(status in ('todo','done')),
 completed_at timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists client_followup_tasks_client_due_idx
 on public.client_followup_tasks(client_id,status,due_date);

create or replace function private.verify_client_visio_note_relation()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$
begin
 if new.appointment_id is not null and not exists (
   select 1 from public.appointments a where a.id=new.appointment_id and a.client_id=new.client_id
 ) then raise exception 'Cette visio ne correspond pas au client' using errcode='23514'; end if;
 new.updated_at:=now();
 return new;
end;
$$;
drop trigger if exists client_visio_note_guard on public.client_visio_notes;
create trigger client_visio_note_guard before insert or update
on public.client_visio_notes for each row execute function private.verify_client_visio_note_relation();

create or replace function private.verify_client_followup_task_relation()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$
begin
 if new.visio_note_id is not null and not exists (
   select 1 from public.client_visio_notes n where n.id=new.visio_note_id and n.client_id=new.client_id
 ) then raise exception 'Le compte rendu ne correspond pas au client' using errcode='23514'; end if;
 new.updated_at:=now();
 if new.status='done' and new.completed_at is null then new.completed_at:=now();end if;
 if new.status='todo' then new.completed_at:=null;end if;
 return new;
end;
$$;
drop trigger if exists client_followup_task_guard on public.client_followup_tasks;
create trigger client_followup_task_guard before insert or update
on public.client_followup_tasks for each row execute function private.verify_client_followup_task_relation();

alter table public.client_visio_notes enable row level security;
alter table public.client_followup_tasks enable row level security;
drop policy if exists coach_visio_notes_select on public.client_visio_notes;
drop policy if exists coach_visio_notes_insert on public.client_visio_notes;
drop policy if exists coach_visio_notes_update on public.client_visio_notes;
drop policy if exists coach_visio_notes_delete on public.client_visio_notes;
create policy coach_visio_notes_select on public.client_visio_notes
 for select to authenticated using ((select private.is_coach()));
create policy coach_visio_notes_insert on public.client_visio_notes
 for insert to authenticated with check ((select private.is_coach()) and created_by=auth.uid());
create policy coach_visio_notes_update on public.client_visio_notes
 for update to authenticated using ((select private.is_coach())) with check ((select private.is_coach()));
create policy coach_visio_notes_delete on public.client_visio_notes
 for delete to authenticated using ((select private.is_coach()));

drop policy if exists coach_followup_tasks_select on public.client_followup_tasks;
drop policy if exists coach_followup_tasks_insert on public.client_followup_tasks;
drop policy if exists coach_followup_tasks_update on public.client_followup_tasks;
drop policy if exists coach_followup_tasks_delete on public.client_followup_tasks;
create policy coach_followup_tasks_select on public.client_followup_tasks
 for select to authenticated using ((select private.is_coach()));
create policy coach_followup_tasks_insert on public.client_followup_tasks
 for insert to authenticated with check ((select private.is_coach()) and created_by=auth.uid());
create policy coach_followup_tasks_update on public.client_followup_tasks
 for update to authenticated using ((select private.is_coach())) with check ((select private.is_coach()));
create policy coach_followup_tasks_delete on public.client_followup_tasks
 for delete to authenticated using ((select private.is_coach()));

revoke all on public.client_visio_notes,public.client_followup_tasks from anon;
grant select,insert,update,delete on public.client_visio_notes,public.client_followup_tasks to authenticated,service_role;
