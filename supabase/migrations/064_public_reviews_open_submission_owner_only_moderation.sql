-- 064 — Depots d'avis libres sur le site public, distincts des avis clients verifies.
-- Les visiteurs peuvent publier leur retour sans compte; seule la personne proprietaire peut masquer ou supprimer.
create table if not exists public.akp_public_reviews (
  id uuid primary key default gen_random_uuid(),
  public_name text not null check (char_length(btrim(public_name)) between 2 and 48),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(btrim(review_text)) between 30 and 1200),
  experience_type text not null default 'decouverte'
    check (experience_type in ('accompagnement','decouverte','autre')),
  consent_publication boolean not null check (consent_publication = true),
  moderation_status text not null default 'published'
    check (moderation_status in ('published','hidden')),
  moderation_reason text,
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  constraint akp_public_reviews_reason check (
    moderation_status <> 'hidden' or char_length(btrim(coalesce(moderation_reason,''))) >= 10
  ),
  constraint akp_public_reviews_no_urls check (review_text !~* '(https?://|www\.)')
);
create index if not exists akp_public_reviews_latest on public.akp_public_reviews (published_at desc) where moderation_status='published';
alter table public.akp_public_reviews enable row level security;
revoke all on table public.akp_public_reviews from public, anon, authenticated;
grant select on table public.akp_public_reviews to anon, authenticated;
grant insert(public_name,rating,review_text,experience_type,consent_publication) on public.akp_public_reviews to anon, authenticated;
grant update(moderation_status,moderation_reason) on public.akp_public_reviews to authenticated;
grant delete on public.akp_public_reviews to authenticated;
create policy akp_open_reviews_public_read on public.akp_public_reviews for select to anon, authenticated using (moderation_status='published');
create policy akp_open_reviews_owner_read on public.akp_public_reviews for select to authenticated
  using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner'::public.app_role));
create policy akp_open_reviews_anyone_submit on public.akp_public_reviews for insert to anon, authenticated
  with check (consent_publication=true and moderation_status='published' and moderation_reason is null);
create policy akp_open_reviews_owner_moderate on public.akp_public_reviews for update to authenticated
  using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner'::public.app_role))
  with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner'::public.app_role));
create policy akp_open_reviews_owner_delete on public.akp_public_reviews for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner'::public.app_role));
