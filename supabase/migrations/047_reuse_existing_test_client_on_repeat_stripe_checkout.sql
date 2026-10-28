-- Un client de démonstration peut effectuer plusieurs achats fictifs successifs.
-- Ne jamais créer une seconde identité Supabase pour la même adresse.
alter table public.stripe_test_orders
  drop constraint if exists stripe_test_orders_test_client_id_key;

create or replace function public.reuse_paid_stripe_test_client(p_invite_id uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $func$
declare
 v_inv public.stripe_test_invites%rowtype;
 v_order public.stripe_test_orders%rowtype;
 v_client public.clients%rowtype;
 v_auth uuid;
begin
 if coalesce(auth.jwt()->>'role','') <> 'service_role' then
  raise exception 'Serveur uniquement' using errcode='42501';
 end if;
 select * into v_inv from public.stripe_test_invites where id=p_invite_id for update;
 if v_inv.id is null then raise exception 'Invitation introuvable'; end if;
 if v_inv.test_client_id is not null then
  return jsonb_build_object('client_id',v_inv.test_client_id,'auth_user_id',v_inv.test_auth_user_id,'reused',true);
 end if;
 select * into v_order from public.stripe_test_orders
  where id=v_inv.stripe_order_id and status='paid' and paid_at is not null
   and stripe_session_id like 'cs_test_%' for update;
 if v_order.id is null then raise exception 'Paiement Stripe TEST non confirmé';end if;
 if v_order.stripe_amount_paid_cents is distinct from
    (case when v_order.payment_mode='monthly' then v_order.monthly_cents else v_order.total_cents end) then
   raise exception 'Montant Stripe TEST non vérifié';
 end if;
 select c.* into v_client from public.clients c
 join auth.users a on a.id=c.auth_user_id
 join public.profiles p on p.id=a.id
 where lower(a.email)=lower(v_order.email)
   and lower(c.email)=lower(v_order.email)
   and c.is_test=true and p.role='client'
 order by c.created_at desc limit 1;
 if v_client.id is null then
   raise exception 'Aucun compte de démonstration existant pour cette adresse';
 end if;
 v_auth:=v_client.auth_user_id;
 update public.stripe_test_invites set
   test_auth_user_id=v_auth,
   test_client_id=v_client.id,
   auth_branded_required=true,
   activated_at=now()
 where id=p_invite_id;
 update public.stripe_test_orders set test_client_id=v_client.id, updated_at=now()
 where id=v_order.id;
 return jsonb_build_object('client_id',v_client.id,'auth_user_id',v_auth,'reused',true);
end;
$func$;
revoke all on function public.reuse_paid_stripe_test_client(uuid) from public,anon,authenticated;
grant execute on function public.reuse_paid_stripe_test_client(uuid) to service_role;