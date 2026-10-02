-- AK PRIME — questionnaires intégrés + liaison comptes clients
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email <> u.email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, role, full_name, email)
  values (new.id,'client',coalesce(new.raw_user_meta_data->>'full_name',''),new.email)
  on conflict (id) do update
  set email = excluded.email,
      full_name = case when coalesce(public.profiles.full_name,'') = '' then excluded.full_name else public.profiles.full_name end;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  pole text not null,
  title text not null,
  description text,
  version integer not null default 1,
  questions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(template_key, version)
);

alter table public.questionnaire_templates enable row level security;
revoke all on public.questionnaire_templates from anon;
grant select on public.questionnaire_templates to authenticated, service_role;
grant insert, update, delete on public.questionnaire_templates to service_role;

drop policy if exists questionnaire_templates_read on public.questionnaire_templates;
create policy questionnaire_templates_read on public.questionnaire_templates
for select to authenticated
using (active = true or private.is_coach());

alter table public.questionnaire_responses
  add column if not exists status text not null default 'submitted',
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.questionnaire_responses
    add constraint questionnaire_responses_status_check
    check (status in ('draft','submitted'));
exception when duplicate_object then null; end $$;

create unique index if not exists questionnaire_one_current_response_idx
  on public.questionnaire_responses(client_id, questionnaire_type, questionnaire_version);

do $$ begin
  create trigger questionnaire_responses_set_updated_at
  before update on public.questionnaire_responses
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

drop policy if exists questionnaire_client_update on public.questionnaire_responses;
create policy questionnaire_client_update on public.questionnaire_responses
for update to authenticated
using (private.can_access_client(client_id))
with check (private.can_access_client(client_id));

-- Les 3 modèles V1 sont insérés par la migration appliquée au projet Supabase :
-- performance_initial / forme_sante_initial / mental_initial.
-- Leur contenu complet est conservé dans la base et peut être versionné sans casser l'historique.
