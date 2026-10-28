-- Distinguish branded onboarding emails from older invitations that already went through Supabase.
alter table public.stripe_test_invites
 add column if not exists auth_branded_required boolean not null default false;
comment on column public.stripe_test_invites.auth_branded_required is
 'True for invitations created by generateLink + Resend; excludes legacy Supabase-delivered invitations.';
