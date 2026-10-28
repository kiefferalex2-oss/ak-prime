-- Fenêtre temporaire de simulation directement depuis les cartes publiques.
-- Aucun encaissement réel, fermeture automatique au bout de sept jours.
create table if not exists private.public_stripe_test_access(
 singleton boolean primary key default true check(singleton),
 enabled_until timestamptz not null
);
insert into private.public_stripe_test_access(singleton,enabled_until)
values(true, now()+interval '7 days')
on conflict(singleton) do update set enabled_until=excluded.enabled_until;
revoke all on private.public_stripe_test_access from public,anon,authenticated;
grant select on private.public_stripe_test_access to service_role;

alter table public.stripe_test_invites
 add column if not exists request_email text;

create or replace function public.issue_direct_stripe_test_invite(
 p_token_hash text, p_email text
) returns uuid
language plpgsql security definer set search_path=''
as $function$
declare v_owner uuid;v_result uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then
  raise exception 'Service interne uniquement.' using errcode='42501';
 end if;
 if p_token_hash !~ '^[a-f0-9]{64}$'
    or length(p_email)>254 or length(p_email)<5
    or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 then raise exception 'Paramètres invalides.' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(843910124);
 if not exists(select 1 from private.public_stripe_test_access
   where singleton and enabled_until>now()) then
   raise exception 'Simulations publiques désactivées.' using errcode='42501';
 end if;
 if (select count(*) from public.stripe_test_invites
      where created_at>now()-interval '24 hours')>=20 then
   raise exception 'Limite journalière de simulations atteinte.' using errcode='22023';
 end if;
 if (select count(*) from public.stripe_test_invites
      where created_at>now()-interval '24 hours'
       and lower(request_email)=lower(p_email))>=2 then
   raise exception 'Deux simulations au maximum par adresse e-mail et par jour.' using errcode='22023';
 end if;
 select id into v_owner from public.profiles where role='owner'
  order by created_at asc limit 1;
 if v_owner is null then raise exception 'Propriétaire non configuré.';end if;
 insert into public.stripe_test_invites(owner_user_id,token_hash,request_email)
 values(v_owner,p_token_hash,lower(p_email)) returning id into v_result;
 return v_result;
end;$function$;
revoke all on function public.issue_direct_stripe_test_invite(text,text) from public,anon,authenticated;
grant execute on function public.issue_direct_stripe_test_invite(text,text) to service_role;