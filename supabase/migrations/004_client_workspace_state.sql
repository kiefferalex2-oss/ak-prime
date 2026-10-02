-- AK PRIME — état de travail interne d'un dossier client
create table if not exists public.client_workspace (
  client_id uuid primary key references public.clients(id) on delete cascade,
  deep_flags jsonb not null default '{}'::jsonb,
  offer_notes jsonb not null default '{}'::jsonb,
  visio_summary text,
  coach_decisions text,
  private_note text,
  renewal_choice text not null default '3 mois',
  updated_at timestamptz not null default now()
);

alter table public.client_workspace enable row level security;

drop policy if exists client_workspace_coach_all on public.client_workspace;
create policy client_workspace_coach_all on public.client_workspace
for all to authenticated
using (private.is_coach())
with check (private.is_coach());

grant select, insert, update, delete on public.client_workspace to authenticated, service_role;
revoke all on public.client_workspace from anon;

do $$ begin
  create trigger client_workspace_set_updated_at before update on public.client_workspace
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create index if not exists client_workspace_updated_idx on public.client_workspace(updated_at desc);
