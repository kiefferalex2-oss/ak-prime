-- AK PRIME : activation commerciale verrouillee jusqu'aux validations RC Pro + mediation.
-- Uniquement la cle serveur Supabase peut lire/modifier ces autorisations.
create table if not exists public.akp_launch_control (
  singleton boolean primary key default true check (singleton),
  insurance_verified boolean not null default false,
  mediation_verified boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.akp_launch_control enable row level security;
revoke all on public.akp_launch_control from public, anon, authenticated;
grant select on public.akp_launch_control to service_role;
insert into public.akp_launch_control(singleton) values(true) on conflict do nothing;

-- Les anciennes autorisations dans les parametres generaux ne doivent pas
-- pouvoir etre modifiees par les utilisateurs de l'espace coach.
alter table public.app_settings drop column if exists insurance_verified;
alter table public.app_settings drop column if exists mediation_verified;

-- Mention TVA en vigueur depuis septembre 2026, avec tolerance pour l'ancien texte.
update public.billing_settings
  set vat_mention='TVA non applicable, art. L. 223 et s. du code des impositions sur les biens et services',
      updated_at=now()
  where vat_exempt=true
    and vat_mention='TVA non applicable, art. 293 B du code général des impôts';
