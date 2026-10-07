-- AK PRIME — tarif Mental Sportif validé
update public.offer_catalog
set base_monthly_cents = 24900,
    updated_at = now()
where code = 'mental_sportif';
