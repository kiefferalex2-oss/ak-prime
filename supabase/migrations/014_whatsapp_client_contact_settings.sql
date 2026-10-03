-- AK PRIME — paramètres WhatsApp visibles par les clients authentifiés

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  whatsapp_number text,
  whatsapp_default_message text not null default 'Bonjour Alex, je te contacte concernant mon accompagnement AK PRIME.',
  updated_at timestamptz not null default now()
);

insert into public.app_settings(id)
values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

revoke all on public.app_settings from anon;
grant select on public.app_settings to authenticated, service_role;
grant insert, update on public.app_settings to authenticated, service_role;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
for select to authenticated
using (true);

drop policy if exists app_settings_coach_insert on public.app_settings;
create policy app_settings_coach_insert on public.app_settings
for insert to authenticated
with check (private.is_coach());

drop policy if exists app_settings_coach_update on public.app_settings;
create policy app_settings_coach_update on public.app_settings
for update to authenticated
using (private.is_coach())
with check (private.is_coach());
