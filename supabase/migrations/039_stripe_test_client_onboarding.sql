-- AK PRIME — test Stripe : liaison unique de commande payée vers compte client DEMO.
-- Le client DEMO commence à l'étape questionnaire initial.
alter table public.stripe_test_orders add column if not exists test_client_id uuid unique references public.clients(id) on delete set null;

CREATE OR REPLACE FUNCTION public.owner_provision_paid_test_client(p_order_id uuid, p_auth_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_order public.stripe_test_orders%rowtype;
 v_id uuid;
 v_start date;
 v_end date;
begin
 if auth.uid() is null or not private.is_owner() then
  raise exception 'Accès propriétaire requis.' using errcode='42501';
 end if;
 select * into v_order from public.stripe_test_orders
 where id=p_order_id and owner_user_id=auth.uid() for update;
 if v_order.id is null then
  raise exception 'Commande test introuvable.';
 end if;
 if v_order.status <> 'paid' or v_order.paid_at is null or
    v_order.stripe_session_id not like 'cs_test_%' or
    v_order.stripe_amount_paid_cents <>
      (case when v_order.payment_mode='monthly' then v_order.monthly_cents else v_order.total_cents end)
 then
  raise exception 'Paiement test non confirmé.';
 end if;
 if v_order.test_client_id is not null then
  raise exception 'Compte test déjà créé pour ce paiement.';
 end if;
 v_id := public.owner_provision_test_client(p_auth_user_id,v_order.offer_code,v_order.full_name);
 v_start := coalesce(v_order.requested_start_date,(v_order.paid_at at time zone 'Europe/Paris')::date+14);
 v_end := (v_start + make_interval(months=>v_order.commitment_months))::date;
 update public.clients set
  status='onboarding',
  portal_access_enabled=true,
  start_date=v_start,
  engagement_end_date=v_end,
  initial_commitment_months=v_order.commitment_months,
  payment_status='SIMULATION Stripe TEST — aucun paiement réel'
 where id=v_id and is_test=true;
 update public.onboarding set
  current_step='questionnaire',
  questionnaire_received_at=null,
  visio_scheduled_at=null,
  visio_completed_at=null,
  tests_completed_at=null,
  programming_ready_at=null,
  onboarding_completed_at=null,
  updated_at=now()
 where client_id=v_id;
 update public.enrollments set
  commitment_months=v_order.commitment_months,
  start_date=v_start,
  end_date=v_end,
  payment_mode=v_order.payment_mode
 where client_id=v_id;
 update public.stripe_test_orders set
  test_client_id=v_id,
  updated_at=now()
 where id=p_order_id;
 return v_id;
end;
$function$


revoke all on function public.owner_provision_paid_test_client(uuid,uuid) from public, anon, authenticated;
grant execute on function public.owner_provision_paid_test_client(uuid,uuid) to authenticated;
