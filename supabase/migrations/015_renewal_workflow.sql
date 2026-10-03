-- AK PRIME — suivi des renouvellements d'engagement

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  due_date date not null,
  status text not null default 'processed' check (status in ('processed')),
  decision text not null check (decision in ('3_months','6_months','monthly','stop')),
  cycle_review_done boolean not null default false,
  retests_required boolean not null default false,
  retests_done boolean not null default false,
  objectives_updated boolean not null default false,
  notes text,
  previous_end_date date not null,
  new_end_date date,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(client_id, due_date)
);

create index if not exists renewals_client_due_idx
  on public.renewals(client_id, due_date desc);

alter table public.renewals enable row level security;

revoke all on public.renewals from anon;
grant select, insert, update, delete on public.renewals to authenticated, service_role;

drop policy if exists renewals_coach_all on public.renewals;
create policy renewals_coach_all on public.renewals
for all to authenticated
using (private.is_coach())
with check (private.is_coach());
