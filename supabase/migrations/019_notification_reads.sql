-- AK PRIME — notifications V1 : persistance des états lus
create table if not exists public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

create index if not exists notification_reads_user_read_idx
  on public.notification_reads(user_id, read_at desc);

alter table public.notification_reads enable row level security;

revoke all on public.notification_reads from anon;
grant select, insert, delete on public.notification_reads to authenticated, service_role;

drop policy if exists notification_reads_self_select on public.notification_reads;
create policy notification_reads_self_select
on public.notification_reads
for select to authenticated
using (user_id = auth.uid());

drop policy if exists notification_reads_self_insert on public.notification_reads;
create policy notification_reads_self_insert
on public.notification_reads
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_reads_self_delete on public.notification_reads;
create policy notification_reads_self_delete
on public.notification_reads
for delete to authenticated
using (user_id = auth.uid());
