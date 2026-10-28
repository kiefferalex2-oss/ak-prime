-- AK PRIME : afficher les consentements associés aux commandes TEST déjà payées.
-- La preuve est un relevé horodaté de consentements; pas un contrat signé en production.
create or replace function public.owner_stripe_test_consent_evidence()
returns jsonb language sql stable security definer set search_path=''
as $f$
select case when auth.uid() is not null and exists(
 select 1 from public.profiles p where p.id=auth.uid() and p.role='owner'
) then coalesce((select jsonb_agg(jsonb_build_object(
  'id',o.id,'source','stripe_test','is_test',true,
  'full_name',o.full_name,'email',o.email,
  'offer_code',o.offer_code,'commitment_months',o.commitment_months,
  'payment_mode',o.payment_mode,'total_cents',o.total_cents,'currency',o.currency,
  'cgv_version',o.cgv_version,'cgv_accepted_at',o.accepted_terms_at,
  'privacy_version',o.privacy_version,'privacy_acknowledged_at',o.privacy_accepted_at,
  'health_consent',(o.health_consent_at is not null),
  'health_consent_at',o.health_consent_at,
  'early_start_requested',o.explicit_early_start,
  'early_start_requested_at',o.early_start_at,
  'accepted_by_user_id',null,
  'contract_snapshot',jsonb_build_object(
     'environment','STRIPE TEST — paiement fictif',
     'consent_captured_at',o.accepted_terms_at,
     'cgv_version',o.cgv_version,'privacy_version',o.privacy_version,
     'privacy_accepted_at',o.privacy_accepted_at,
     'health_consent_at',o.health_consent_at,
     'early_start_requested',o.explicit_early_start,
     'requested_start_date',o.requested_start_date,
     'stripe_checkout_session',o.stripe_session_id,
     'payment_confirmed_at',o.paid_at
   ),
  'evidence_checksum',null,'status',o.status,
  'paid_at',o.paid_at,'created_at',o.created_at,
  'start_mode',case when o.requested_start_date is null then 'asap' else 'date' end,
  'requested_start_date',o.requested_start_date,
  'confirmed_start_date',null
) order by o.created_at desc)
from public.stripe_test_orders o where o.status='paid'), '[]'::jsonb)
else null end;
$f$;
revoke all on function public.owner_stripe_test_consent_evidence() from public,anon;
grant execute on function public.owner_stripe_test_consent_evidence() to authenticated;