-- Uniquement pour les souscriptions Stripe TEST initiées via un lien propriétaire.
-- Le message contient la facture hébergée par Stripe et la mention de simulation.
create or replace function public.send_invited_stripe_test_invoice(
 p_invite_id uuid,p_invoice_number text,p_invoice_url text
) returns boolean
language plpgsql security definer set search_path=''
as $function$
declare v_pass public.stripe_test_invites%rowtype;
        v_order public.stripe_test_orders%rowtype;
        v_api text;v_from text;v_request bigint;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then
  raise exception 'Accès serveur requis.' using errcode='42501';end if;
 if p_invoice_url !~ '^https://(invoice|pay)[.]stripe[.]com/' then
   raise exception 'URL de facture Stripe non reconnue.';end if;
 select * into v_pass from public.stripe_test_invites where id=p_invite_id for update;
 if v_pass.id is null or v_pass.invoice_email_queued_at is not null
    or v_pass.test_client_id is null then return false;end if;
 select * into v_order from public.stripe_test_orders
 where id=v_pass.stripe_order_id and status='paid' and paid_at is not null;
 if v_order.id is null then return false;end if;
 select decrypted_secret into v_api from vault.decrypted_secrets
 where name='akprime_resend_api_key' order by created_at desc limit 1;
 if v_api is null or left(v_api,3)<>'re_' then return false;end if;
 select from_address into v_from from private.notification_mail_settings where singleton=true and enabled=true;
 if v_from is null then return false;end if;
 select net.http_post(
  url:='https://api.resend.com/emails',
  headers:=jsonb_build_object(
   'Authorization','Bearer '||v_api,'Content-Type','application/json',
   'Idempotency-Key','akprime-stripe-test-invoice-'||p_invite_id::text),
  body:=jsonb_build_object(
   'from',v_from,'to',jsonb_build_array(v_order.email),
   'subject','AK PRIME — Facture de démonstration Stripe TEST',
   'text','Bonjour '||v_order.full_name||E',\n\n'||
    'Voici la facture simulée correspondant à votre souscription de test AK PRIME.'||E'\n'||
    'Numéro Stripe TEST : '||left(coalesce(p_invoice_number,'FACTURE-TEST'),80)||E'\n'||
    'Consulter la facture de test : '||p_invoice_url||E'\n\n'||
    'IMPORTANT : aucun argent réel n''a été prélevé. Ce document est une facture de simulation Stripe, '||
    'et ne constitue pas une pièce comptable émise par AK PRIME.'||E'\n\n'||
    'AK PRIME — contact@akprime.fr'),
  timeout_milliseconds:=10000
 ) into v_request;
 update public.stripe_test_invites
 set invoice_email_queued_at=now()
 where id=p_invite_id;
 return v_request is not null;
end;
$function$;
revoke all on function public.send_invited_stripe_test_invoice(uuid,text,text) from public,anon,authenticated;
grant execute on function public.send_invited_stripe_test_invoice(uuid,text,text) to service_role;