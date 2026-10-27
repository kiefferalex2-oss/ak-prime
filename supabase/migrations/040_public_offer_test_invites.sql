-- AK PRIME : invitations de simulation, accessibles seulement par un lien propriétaire court.
create table if not exists public.stripe_test_invites(
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 owner_user_id uuid not null references auth.users(id),
 stripe_order_id uuid unique references public.stripe_test_orders(id),
 expires_at timestamptz not null default now()+interval '3 hours',
 created_at timestamptz not null default now(),
 activated_at timestamptz,
 test_auth_user_id uuid references auth.users(id) on delete set null,
 test_client_id uuid references public.clients(id) on delete set null,
 invoice_email_queued_at timestamptz,
 check (activated_at is null or stripe_order_id is not null)
);
alter table public.stripe_test_invites enable row level security;
revoke all on public.stripe_test_invites from public,anon,authenticated;
grant select,insert,update on public.stripe_test_invites to service_role;
create index if not exists stripe_test_invites_owner_idx on public.stripe_test_invites(owner_user_id,created_at desc);
comment on table public.stripe_test_invites is 'Invitations temporaires pour tester les cartes publiques, sans paiement réel.';

create or replace function public.provision_invited_stripe_test_client(p_invite_id uuid, p_auth_user_id uuid)
returns uuid
language plpgsql security definer set search_path=''
as $function$
declare v_pass public.stripe_test_invites%rowtype;
        v_order public.stripe_test_orders%rowtype;
        v_offer public.offer_catalog%rowtype;
        v_id uuid;v_date date;v_end date;v_first text;v_last text;v_email text;
begin
 if current_user <> 'service_role' then raise exception 'Service interne uniquement.' using errcode='42501'; end if;
 select * into v_pass from public.stripe_test_invites where id=p_invite_id for update;
 if v_pass.id is null or v_pass.stripe_order_id is null then raise exception 'Invitation invalide.';end if;
 if v_pass.test_client_id is not null then return v_pass.test_client_id;end if;
 select * into v_order from public.stripe_test_orders where id=v_pass.stripe_order_id;
 if v_order.status<>'paid' or v_order.paid_at is null or v_order.stripe_session_id not like 'cs_test_%'
 then raise exception 'Paiement fictif non confirmé.';end if;
 if v_order.stripe_amount_paid_cents is distinct from
 (case when v_order.payment_mode='monthly' then v_order.monthly_cents else v_order.total_cents end)
 then raise exception 'Montant de paiement fictif invalide.';end if;
 select lower(email) into v_email from auth.users where id=p_auth_user_id;
 if v_email is null or v_email<>lower(v_order.email) then raise exception 'Identité e-mail différente.';end if;
 if exists(select 1 from public.clients where auth_user_id=p_auth_user_id) then
  raise exception 'Compte déjà associé à un autre dossier.';end if;
 select * into v_offer from public.offer_catalog where code=v_order.offer_code and active=true;
 if v_offer.code is null then raise exception 'Offre inconnue.';end if;
 v_first := split_part(btrim(v_order.full_name),' ',1);
 v_last := coalesce(nullif(btrim(substring(btrim(v_order.full_name) from length(v_first)+2)),''),'-');
 v_date := coalesce(v_order.requested_start_date,(v_order.paid_at at time zone 'Europe/Paris')::date+14);
 v_end := (v_date+make_interval(months=>v_order.commitment_months))::date;
 insert into public.clients(auth_user_id,first_name,last_name,email,current_pole,current_offer,status,
 start_date,engagement_end_date,initial_commitment_months,payment_status,portal_access_enabled,is_test)
 values (p_auth_user_id,v_first,v_last,v_email,v_offer.pole,v_offer.offer_name,'onboarding',
 v_date,v_end,v_order.commitment_months,'Stripe TEST — sans recette réelle',true,true)
 returning id into v_id;
 insert into public.client_workspace(client_id) values(v_id);
 insert into public.onboarding(client_id,current_step) values(v_id,'questionnaire');
 insert into public.enrollments(client_id,pole,offer,commitment_months,start_date,end_date,payment_mode,status)
 values(v_id,v_offer.pole,v_offer.offer_name,v_order.commitment_months,v_date,v_end,v_order.payment_mode,'active');
 update public.stripe_test_invites set test_auth_user_id=p_auth_user_id,test_client_id=v_id,activated_at=now()
 where id=p_invite_id;
 update public.stripe_test_orders set test_client_id=v_id,updated_at=now() where id=v_order.id;
 return v_id;
end;$function$;
revoke all on function public.provision_invited_stripe_test_client(uuid,uuid) from public,anon,authenticated;
grant execute on function public.provision_invited_stripe_test_client(uuid,uuid) to service_role;