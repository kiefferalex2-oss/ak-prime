-- Accept invitation and password recovery links; HTML encode only once.
create or replace function public.send_invited_stripe_test_auth_email(
  p_invite_id uuid,
  p_action_link text
) returns boolean
language plpgsql security definer set search_path=''
as $function$
declare
  v_inv public.stripe_test_invites%rowtype;
  v_order public.stripe_test_orders%rowtype;
  v_key text;
  v_sender text;
  v_html text;
  v_request bigint;
  v_greeting text;
  v_expected_amount integer;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception 'Accès serveur uniquement.' using errcode='42501';
  end if;
  if length(coalesce(p_action_link,''))>4096 or
     p_action_link !~ '^https://gptvgldboqarfklorjip[.]supabase[.]co/auth/v1/verify[?]' or
     p_action_link !~ '[?&]type=(invite|recovery)([&]|$)' then
     raise exception 'Lien d’activation Supabase incorrect.' using errcode='22023';
  end if;
  select * into v_inv from public.stripe_test_invites where id=p_invite_id for update;
  if v_inv.id is null or v_inv.auth_invite_email_queued_at is not null then return false;end if;
  if v_inv.test_auth_user_id is null or v_inv.test_client_id is null then
    raise exception 'Compte TEST non créé.' using errcode='22023';
  end if;
  select * into v_order from public.stripe_test_orders
   where id=v_inv.stripe_order_id and status='paid' and paid_at is not null
   and test_client_id=v_inv.test_client_id;
  if v_order.payment_mode='monthly' then
    v_expected_amount:=v_order.monthly_cents;
  else
    v_expected_amount:=v_order.total_cents;
  end if;
  if v_order.id is null
     or v_order.stripe_session_id not like 'cs_test_%'
     or v_order.stripe_amount_paid_cents is distinct from v_expected_amount then
    raise exception 'Paiement test non confirmé.' using errcode='22023';
  end if;
  if not exists (
    select 1 from auth.users u
     where u.id=v_inv.test_auth_user_id and lower(u.email)=lower(v_order.email)
  ) then raise exception 'Adresse e-mail non conforme.' using errcode='22023';end if;

  select decrypted_secret into v_key from vault.decrypted_secrets
   where name='akprime_resend_api_key' order by created_at desc limit 1;
  select from_address into v_sender from private.notification_mail_settings
   where singleton=true and enabled=true;
  if v_key is null or v_key not like 're_%' or v_sender is null then
    raise exception 'Service e-mail AK PRIME indisponible.' using errcode='50300';
  end if;
  select html into v_html from private.akprime_auth_email_templates where kind='invite_test';
  if v_html is null then raise exception 'Modèle d’invitation absent.';end if;
  -- Une adresse déjà inscrite doit recevoir une invitation de récupération,
  -- pas un faux e-mail de création d'un deuxième compte.
  if p_action_link ~ '[?&]type=recovery([&]|$)' then
    v_html:=pg_catalog.replace(v_html,
      'Votre espace personnel vous attend.',
      'Retrouvez votre accès AK PRIME.');
    v_html:=pg_catalog.replace(v_html,
      'CRÉER MON MOT DE PASSE',
      'RETROUVER MON ACCÈS');
    v_html:=pg_catalog.replace(v_html,
      'Votre accompagnement commence ici. Activez votre accès sécurisé pour choisir votre mot de passe, remplir votre questionnaire initial et préparer votre première visio.',
      'Votre compte AK PRIME existe déjà. Utilisez ce lien sécurisé pour retrouver votre accès et poursuivre votre accompagnement. Aucun nouveau compte ni nouveau paiement n’est nécessaire.');
  end if;
  v_greeting:='Bonjour '||pg_catalog.initcap(pg_catalog.btrim(v_order.full_name))||',';
  v_html:=pg_catalog.replace(v_html,'{{CUSTOMER_GREETING}}',private.ak_mail_escape(v_greeting));
  v_html:=pg_catalog.replace(v_html,'{{ACTION_LINK}}',
     private.ak_mail_escape(p_action_link));
  select net.http_post(
   url:='https://api.resend.com/emails',
   headers:=jsonb_build_object(
      'Authorization','Bearer '||v_key,'Content-Type','application/json',
      'Idempotency-Key','akprime-invite-test-'||v_inv.id::text),
   body:=jsonb_build_object(
      'from',v_sender,
      'to',jsonb_build_array(v_order.email),
      'subject','AK PRIME — Activez votre espace personnel',
      'html',v_html
   ),timeout_milliseconds:=10000
  ) into v_request;
  if v_request is null then
     raise exception 'Service e-mail non joignable.' using errcode='50300';
  end if;
  update public.stripe_test_invites set
      auth_invite_email_queued_at=now(),
      auth_invite_email_request_id=v_request
   where id=v_inv.id;
  return true;
end;
$function$;
revoke all on function public.send_invited_stripe_test_auth_email(uuid,text)
 from public,anon,authenticated;
grant execute on function public.send_invited_stripe_test_auth_email(uuid,text)
 to service_role;