-- AK PRIME — check-in hebdomadaire client
create unique index if not exists checkins_one_per_week_idx
  on public.checkins(client_id, week_date);
