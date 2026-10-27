alter table public.stripe_test_orders
 add column if not exists privacy_version text,
 add column if not exists privacy_accepted_at timestamptz,
 add column if not exists health_consent_at timestamptz;
