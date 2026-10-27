-- AK PRIME — suite du parcours client après paiement Stripe TEST.
-- Lie une commande test payée à UN seul compte de démonstration.
-- Aucune facture, transaction comptable ni vrai accès client n'est créé.
alter table public.stripe_test_orders
  add column if not exists test_client_id uuid unique references public.clients(id) on delete set null;

comment on column public.stripe_test_orders.test_client_id is
  'Compte de démonstration lié après webhook Stripe TEST. Jamais un dossier client réel.';

create or replace function public.owner_provision_paid_test_client(
  p_order_id uuid,
  p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_order public.stripe_test_orders%rowtype;
 v_id uuid;
 v_start date;
 v_end date;
begin
 if auth.uid() is null or not private.is_owner() then
   raise exception 'Action réservée au propriétaire AK PRIME.' using errcode='42501';
 end if;
 select * into v_order
 from public.stripe_test_orders
 where id=p_order_id and owner_user_id=auth.uid()
 for update;
 if not found or v_order.status <> 'paid' or v_order.paid_at is null
    or v_order.stripe_session_id not like 'cs_test_%'
    or v_order.stripe_amount_paid_cents is distinct from
       case when v_order.payment_mode='monthly' then v_order.monthly_cents else v_order.total_cents end
 then
   raise exception 'Commande Stripe TEST non confirmée.' using errcode='22023';
 end if;
 if v_order.test_client_id is not null then
   raise exception 'Un compte de démonstration est déjà lié à ce paiement.' using errcode='23505';
 end if;

 -- La fonction existante impose un compte auth @example.com, un maximum de
 -- démonstrations et la restriction OWNER.
 v_id := public.owner_provision_test_client(
   p_auth_user_id, v_order.offer_code, v_order.full_name
 );

 -- À la différence de l'ancien compte TEST pré-rempli comme actif,
 -- recommencer le vrai parcours d'onboarding.
 v_start := coalesce(
   v_order.requested_start_date,
   ((v_order.paid_at at time zone 'Europe/Paris')::date + 14)
 );
 v_end := (v_start + make_interval(months=>v_order.commitment_months))::date;

 update public.clients
 set status='onboarding', start_date=v_start, engagement_end_date=v_end,
     initial_commitment_months=v_order.commitment_months,
     payment_status='SIMULATION — paiement Stripe TEST confirmé',
     portal_access_enabled=true, is_test=true
 where id=v_id and is_test=true;

 update public.onboarding
 set questionnaire_received_at=null, visio_scheduled_at=null,
     visio_completed_at=null, tests_completed_at=null,
     programming_ready_at=null, onboarding_completed_at=null,
     current_step='questionnaire', updated_at=now()
 where client_id=v_id;

 update public.enrollments
 set commitment_months=v_order.commitment_months,
     start_date=v_start,end_date=v_end,
     payment_mode=v_order.payment_mode
 where client_id=v_id;

 update public.cycles
 set start_date=v_start,
     end_date=least(v_start+42,v_end),
     title='Cycle initial — parcours client TEST'
 where client_id=v_id and title='Cycle de démonstration';

 update public.client_assessment_plans
 set due_date=case phase
   when 'initial' then v_start
   when 'retest' then v_start+42
   when 'cycle_end' then least(v_start+42,v_end)
   else due_date
 end
 where client_id=v_id and source='offer_schedule';

 update public.stripe_test_orders
 set test_client_id=v_id,updated_at=now()
 where id=p_order_id and test_client_id is null;

 return v_id;
end;
$function$;

revoke all on function public.owner_provision_paid_test_client(uuid,uuid) from public,anon,authenticated;
grant execute on function public.owner_provision_paid_test_client(uuid,uuid) to authenticated;
