-- Stripe : environnement de validation isolé des clients et de la comptabilité.
-- Aucune commande de ce tableau ne doit activer un vrai dossier client.
create table if not exists public.stripe_test_orders (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 offer_code text not null references public.offer_catalog(code),
 commitment_months smallint not null check(commitment_months in (3,6)),
 payment_mode text not null check(payment_mode in ('monthly','upfront')),
 full_name text not null check(length(btrim(full_name)) between 3 and 160),
 email text not null,
 monthly_cents integer not null check(monthly_cents>0),
 total_cents integer not null check(total_cents>0),
 currency text not null default 'eur' check(currency='eur'),
 cgv_version text not null,
 accepted_terms_at timestamptz not null,
 requested_start_date date,
 explicit_early_start boolean not null default false,
 early_start_at timestamptz,
 status text not null default 'pending' check(status in ('pending','checkout_created','paid','cancelled','expired','failed')),
 stripe_session_id text unique,
 stripe_customer_id text,
 stripe_subscription_id text,
 stripe_payment_intent_id text,
 stripe_amount_paid_cents integer,
 subscription_cancel_at timestamptz,
 last_error text,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint stripe_test_early_start_consistency check(explicit_early_start = (early_start_at is not null))
);
create index if not exists stripe_test_orders_owner_created_idx on public.stripe_test_orders(owner_user_id,created_at desc);
create index if not exists stripe_test_orders_subscription_idx on public.stripe_test_orders(stripe_subscription_id);
alter table public.stripe_test_orders enable row level security;
revoke all on public.stripe_test_orders from PUBLIC,anon,authenticated;
grant select,insert,update on public.stripe_test_orders to service_role;

create table if not exists public.stripe_test_webhook_events (
 stripe_event_id text primary key,
 event_type text not null,
 event_status text not null default 'processing' check(event_status in ('processing','processed','failed','ignored')),
 attempt_count integer not null default 1,
 error_message text,
 created_at timestamptz not null default now(),
 processed_at timestamptz
);
alter table public.stripe_test_webhook_events enable row level security;
revoke all on public.stripe_test_webhook_events from PUBLIC,anon,authenticated;
grant select,insert,update on public.stripe_test_webhook_events to service_role;

comment on table public.stripe_test_orders is 'Stripe test mode only. Ne jamais utiliser pour attester un paiement réel ni donner accès client.';
comment on table public.stripe_test_webhook_events is 'Journal des webhooks Stripe TEST validés par signature.';
