-- AK PRIME — fondation du tunnel de paiement
-- Catalogue public en lecture seule, calcul tarifaire serveur et intentions privées.

create table if not exists public.offer_catalog (
  code text primary key,
  pole text not null check (pole in ('Forme & Santé','Performance','Mental')),
  offer_name text not null,
  base_monthly_cents integer not null check (base_monthly_cents > 0),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offer_catalog enable row level security;

revoke all on table public.offer_catalog from anon, authenticated;
grant select on table public.offer_catalog to anon, authenticated;
grant select, insert, update, delete on table public.offer_catalog to service_role;

drop policy if exists offer_catalog_public_read on public.offer_catalog;
create policy offer_catalog_public_read
on public.offer_catalog
for select
to anon, authenticated
using (active = true);

insert into public.offer_catalog (code,pole,offer_name,base_monthly_cents,display_order)
values
  ('forme_standard','Forme & Santé','Standard',9900,10),
  ('forme_renforce','Forme & Santé','Renforcé',14900,20),
  ('performance_p1','Performance','P1',14900,30),
  ('performance_p2','Performance','P2',19900,40),
  ('performance_p3','Performance','P3',29900,50),
  ('mental_particulier','Mental','Particulier',19900,60),
  ('mental_sportif','Mental','Sportif',22900,70)
on conflict (code) do update set
  pole = excluded.pole,
  offer_name = excluded.offer_name,
  base_monthly_cents = excluded.base_monthly_cents,
  display_order = excluded.display_order,
  active = true,
  updated_at = now();

create or replace function public.quote_offer(
  p_offer_code text,
  p_commitment_months integer,
  p_payment_mode text
)
returns table(
  offer_code text,
  pole text,
  offer_name text,
  base_monthly_cents integer,
  monthly_equivalent_cents integer,
  total_cents integer,
  currency text
)
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_offer public.offer_catalog%rowtype;
  v_monthly integer;
  v_total integer;
begin
  if p_commitment_months not in (3,6) then
    raise exception 'Durée d''engagement invalide.';
  end if;

  if p_payment_mode not in ('monthly','upfront') then
    raise exception 'Mode de paiement invalide.';
  end if;

  select *
  into v_offer
  from public.offer_catalog o
  where o.code = p_offer_code
    and o.active = true
  limit 1;

  if v_offer.code is null then
    raise exception 'Offre indisponible.';
  end if;

  if p_commitment_months = 3 then
    if p_payment_mode = 'monthly' then
      v_monthly := v_offer.base_monthly_cents;
      v_total := v_offer.base_monthly_cents * 3;
    else
      v_total := round((v_offer.base_monthly_cents * 3)::numeric * 0.97)::integer;
      v_monthly := round(v_total::numeric / 3)::integer;
    end if;
  else
    v_monthly := round(v_offer.base_monthly_cents::numeric * 0.95)::integer;
    v_total := v_monthly * 6;
    if p_payment_mode = 'upfront' then
      v_total := round(v_total::numeric * 0.98)::integer;
      v_monthly := round(v_total::numeric / 6)::integer;
    end if;
  end if;

  return query
  select
    v_offer.code,
    v_offer.pole,
    v_offer.offer_name,
    v_offer.base_monthly_cents,
    v_monthly,
    v_total,
    'eur'::text;
end;
$function$;

revoke all on function public.quote_offer(text,integer,text) from public;
grant execute on function public.quote_offer(text,integer,text) to anon, authenticated, service_role;

create table if not exists private.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  offer_code text not null references public.offer_catalog(code),
  commitment_months integer not null check (commitment_months in (3,6)),
  payment_mode text not null check (payment_mode in ('monthly','upfront')),
  full_name text not null check (char_length(btrim(full_name)) between 3 and 160),
  email text not null check (
    char_length(email) between 5 and 320
    and email like '%_@_%._%'
  ),
  quoted_monthly_equivalent_cents integer not null check (quoted_monthly_equivalent_cents > 0),
  quoted_total_cents integer not null check (quoted_total_cents > 0),
  currency text not null default 'eur' check (currency = 'eur'),
  terms_version text not null,
  privacy_version text not null,
  terms_accepted_at timestamptz not null,
  privacy_acknowledged_at timestamptz not null,
  health_data_consent_at timestamptz not null,
  early_start_requested_at timestamptz not null,
  status text not null default 'pending' check (
    status in ('pending','checkout_created','paid','expired','cancelled','failed')
  ),
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  client_id uuid references public.clients(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checkout_intents_email_created_idx
  on private.checkout_intents (lower(email), created_at desc);

create index if not exists checkout_intents_status_expiry_idx
  on private.checkout_intents (status, expires_at);

alter table private.checkout_intents enable row level security;

revoke all on table private.checkout_intents from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.checkout_intents to service_role;
