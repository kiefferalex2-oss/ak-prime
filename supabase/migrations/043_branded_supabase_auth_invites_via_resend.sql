-- AK PRIME: branded transactional invitation mail sent via existing Resend vault credentials.
-- Only after a signed Stripe TEST webhook has confirmed a matching order.
alter table public.stripe_test_invites
  add column if not exists auth_invite_email_queued_at timestamptz,
  add column if not exists auth_invite_email_request_id bigint;

create table if not exists private.akprime_auth_email_templates (
  kind text primary key,
  html text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.akprime_auth_email_templates from public,anon,authenticated;
insert into private.akprime_auth_email_templates(kind,html)
values ('invite_test',$ak_prime_auth_template$<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Bienvenue chez AK PRIME</title>
<style>
@media only screen and (max-width:620px){
  .ak-wrap{padding:12px 7px!important}
  .ak-pad{padding-left:22px!important;padding-right:22px!important}
  .ak-heading{font-size:31px!important;line-height:1.17!important}
  .ak-art{display:none!important}
  .ak-cta{display:block!important}
  .ak-brand{font-size:23px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#e9eef5;color:#12263b;-webkit-text-size-adjust:100%;">
<div style="display:none!important;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;">Bienvenue chez AK PRIME — AK PRIME.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#e9eef5;border-collapse:collapse;">
<tr><td class="ak-wrap" align="center" style="padding:37px 12px 42px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border:1px solid #dae4ef;border-radius:16px;overflow:hidden;border-collapse:separate;border-spacing:0;">
<tr><td style="height:6px;background:#d8b16d;font-size:1px;line-height:6px;">&nbsp;</td></tr>
<tr><td class="ak-pad" style="background:#081421;padding:29px 39px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="width:42px;height:42px;background:#d8b16d;border-radius:8px;color:#081421;text-align:center;font:900 21px/42px Arial,Helvetica,sans-serif;">AK</td>
<td style="width:13px;">&nbsp;</td>
<td><div class="ak-brand" style="font:900 26px/1.05 Arial,Helvetica,sans-serif;letter-spacing:1.7px;color:#ffffff;">PRIME<span style="color:#d8b16d;">.</span></div>
<div style="font:700 8px/1.75 Arial,Helvetica,sans-serif;letter-spacing:2.3px;color:#90a7c1;margin-top:4px;">PRÉPARATION &amp; ACCOMPAGNEMENT</div></td>
</tr></table></td>
<td align="right" valign="middle" style="font:700 9px/1.7 Arial,Helvetica,sans-serif;letter-spacing:1.8px;color:#c3ceda;">PERFORMANCE<br>PROGRESSION<br><span style="color:#d8b16d;">ÉQUILIBRE</span></td>
</tr></table></td></tr>
<tr><td class="ak-pad" style="padding:31px 39px 38px;background:#0d1b2c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #2e3d52;padding-top:22px;">
<span style="font:900 10px/1.7 Arial,Helvetica,sans-serif;color:#d8b16d;letter-spacing:2.2px;">ACTIVATION DE VOTRE ESPACE</span>
</td></tr></table>
<p style="font:400 14px/1.65 Arial,Helvetica,sans-serif;color:#c6d6e6;margin:22px 0 0;">{{CUSTOMER_GREETING}}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px 0 0;"><tr><td style="background:#2b2b25;border:1px solid #987b50;border-radius:6px;padding:7px 11px;color:#f2d397;font:800 10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1px;">PARCOURS DE DÉMONSTRATION · AUCUN PAIEMENT RÉEL</td></tr></table>
<h1 class="ak-heading" style="font:900 40px/1.16 Arial,Helvetica,sans-serif;letter-spacing:-1.2px;color:#ffffff;margin:23px 0 13px;">Votre espace personnel vous attend.</h1>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;"><tr><td style="height:4px;width:66px;background:#d8b16d;border-radius:4px;font-size:1px;">&nbsp;</td><td width="8">&nbsp;</td><td style="height:4px;width:20px;background:#2f66f6;border-radius:4px;font-size:1px;">&nbsp;</td></tr></table>
<p style="font:400 16px/1.7 Arial,Helvetica,sans-serif;color:#c6d6e6;margin:0 0 24px;">Votre accompagnement commence ici. Activez votre accès sécurisé pour choisir votre mot de passe, remplir votre questionnaire initial et préparer votre première visio.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="background:#d8b16d;border-radius:9px;">
<a class="ak-cta" href="{{ACTION_LINK}}" style="display:block;padding:18px 14px;font:900 15px/1.35 Arial,Helvetica,sans-serif;color:#091927;text-decoration:none;text-align:center;">CRÉER MON MOT DE PASSE &nbsp; &#8594;</a>
</td></tr></table>
<p style="color:#90a6be;font:700 11px/1.6 Arial,Helvetica,sans-serif;letter-spacing:1px;margin:22px 0 0;">UN OBJECTIF. UN PLAN. DES RÉSULTATS.</p>
</td></tr>
<tr><td style="height:7px;background:#2f66f6;font-size:1px;line-height:7px;">&nbsp;</td></tr>
<tr><td class="ak-pad" style="background:#ffffff;padding:34px 39px 31px;">
<h2 style="font:900 12px/1.6 Arial,Helvetica,sans-serif;letter-spacing:1.5px;color:#162c44;margin:0 0 17px;">LES PROCHAINES ÉTAPES</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafd;border:1px solid #dce5ee;border-left:5px solid #2f66f6;border-radius:10px;">
<tr><td style="padding:20px 22px 18px;">
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:0 0 0;"><span style="font-weight:900;color:#b78f4c;">1.</span> &nbsp; Créez votre mot de passe personnel.</p>
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:11px 0 0;"><span style="font-weight:900;color:#b78f4c;">2.</span> &nbsp; Complétez le questionnaire initial adapté à votre formule.</p>
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:11px 0 0;"><span style="font-weight:900;color:#b78f4c;">3.</span> &nbsp; Préparez votre démarrage depuis votre espace client.</p>
</td></tr></table>
<p style="font:400 12px/1.7 Arial,Helvetica,sans-serif;color:#718397;margin:22px 0 0;">Ce message confirme la création de votre accès AK PRIME. Si vous n’êtes pas à l’origine de cette inscription, vous pouvez ignorer cet e-mail.</p>
</td></tr>
<tr><td class="ak-pad" style="background:#091827;padding:28px 39px 31px;">
<p style="margin:0;font:900 17px/1.3 Arial,Helvetica,sans-serif;letter-spacing:1px;color:#ffffff;">AK <span style="color:#d8b16d;">PRIME.</span></p>
<p style="margin:7px 0 0;color:#cad5e2;font:400 13px/1.65 Arial,Helvetica,sans-serif;">La progression ne s'improvise pas.</p>
<p style="margin:18px 0 0;color:#cad5e2;font:400 12px/1.8 Arial,Helvetica,sans-serif;"><a href="https://akprime.fr" style="color:#d8b16d;text-decoration:none;">akprime.fr</a> &nbsp; / &nbsp; <a href="mailto:contact@akprime.fr" style="color:#cad5e2;text-decoration:none;">contact@akprime.fr</a></p>
<p style="margin:14px 0 0;color:#7891a8;font:400 10px/1.6 Arial,Helvetica,sans-serif;">Communication transactionnelle AK PRIME. Aucun mot de passe ne vous sera demandé par e-mail.</p>
</td></tr>
</table></td></tr></table>
</body></html>$ak_prime_auth_template$)
on conflict (kind) do update
 set html=excluded.html,updated_at=now();

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