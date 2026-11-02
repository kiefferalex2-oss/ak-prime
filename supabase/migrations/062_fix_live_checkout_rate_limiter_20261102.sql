-- Correction du paiement réel AK PRIME (02/11/2026).
-- La variable PL/pgSQL « bucket » était ambiguë avec la colonne SQL du même nom.
-- Cela provoquait SQLSTATE 42702, déguisé par le frontend en erreur 429.
-- Maintient la restriction au rôle service_role et une limite de 20 tentatives/heure
-- pour un même couple IP + e-mail, sans affaiblir les autres contrôles Stripe.
create or replace function public.reserve_stripe_live_checkout(p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_requests integer;
  v_bucket timestamptz := date_trunc('hour', now());
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into private.stripe_live_checkout_limiter(key_hash, bucket, requests)
  values (p_key_hash, v_bucket, 1)
  on conflict (key_hash, bucket)
    do update set requests = private.stripe_live_checkout_limiter.requests + 1
  returning requests into v_requests;

  return v_requests <= 20;
end;
$function$;
