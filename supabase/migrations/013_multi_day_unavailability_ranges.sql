-- AK PRIME — indisponibilités sur plusieurs jours
alter table public.availability_exceptions
  add column if not exists end_date date;

update public.availability_exceptions
set end_date = exception_date
where end_date is null;

-- Le projet Supabase applique aussi :
-- - end_date >= exception_date
-- - filtrage de get_my_available_slots sur toute la plage
-- - possibilité de bloquer une journée entière ou la même plage horaire
--   sur plusieurs jours consécutifs.
