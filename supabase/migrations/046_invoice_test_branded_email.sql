-- AK PRIME — facture Stripe TEST : e-mail HTML aligné sur les notifications de la marque.
-- Les documents sont ceux de Stripe et sont explicitement sans valeur comptable.
insert into private.akprime_auth_email_templates(kind,html)
values ('invoice_test',$akinvoicehtml$<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Votre facture AK PRIME</title>
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
<span style="font:900 10px/1.7 Arial,Helvetica,sans-serif;color:#d8b16d;letter-spacing:2.2px;">FACTURATION & ACCOMPAGNEMENT</span>
</td></tr></table>
<p style="font:400 14px/1.65 Arial,Helvetica,sans-serif;color:#c6d6e6;margin:22px 0 0;">{{CUSTOMER_GREETING}}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px 0 0;"><tr><td style="background:#2b2b25;border:1px solid #987b50;border-radius:6px;padding:7px 11px;color:#f2d397;font:800 10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1px;">DOCUMENT DE SIMULATION · AUCUN DÉBIT RÉEL</td></tr></table>

<h1 class="ak-heading" style="font:900 40px/1.16 Arial,Helvetica,sans-serif;letter-spacing:-1.2px;color:#ffffff;margin:23px 0 13px;">Votre facture est disponible.</h1>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;"><tr><td style="height:4px;width:66px;background:#d8b16d;border-radius:4px;font-size:1px;">&nbsp;</td><td width="8">&nbsp;</td><td style="height:4px;width:20px;background:#2f66f6;border-radius:4px;font-size:1px;">&nbsp;</td></tr></table>
<p style="font:400 16px/1.7 Arial,Helvetica,sans-serif;color:#c6d6e6;margin:0 0 24px;">Merci pour votre souscription à AK PRIME. Retrouvez ci-dessous votre récapitulatif de paiement et les documents de facturation liés à votre accompagnement.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="background:#d8b16d;border-radius:9px;">
<a class="ak-cta" href="{{INVOICE_LINK}}" style="display:block;padding:18px 14px;font:900 15px/1.35 Arial,Helvetica,sans-serif;color:#091927;text-decoration:none;text-align:center;">CONSULTER MA FACTURE &nbsp; &#8594;</a>
</td></tr></table>
{{PDF_CTA}}
<p style="color:#90a6be;font:700 11px/1.6 Arial,Helvetica,sans-serif;letter-spacing:1px;margin:22px 0 0;">UN OBJECTIF. UN PLAN. DES RÉSULTATS.</p>
</td></tr>
<tr><td style="height:7px;background:#2f66f6;font-size:1px;line-height:7px;">&nbsp;</td></tr>
<tr><td class="ak-pad" style="background:#ffffff;padding:34px 39px 31px;">
<h2 style="font:900 12px/1.6 Arial,Helvetica,sans-serif;letter-spacing:1.5px;color:#162c44;margin:0 0 17px;">DÉTAILS DE LA SOUSCRIPTION</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafd;border:1px solid #dce5ee;border-left:5px solid #2f66f6;border-radius:10px;">
<tr><td style="padding:20px 22px 18px;">
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:0 0 0;"><span style="font-weight:900;color:#b78f4c;">1.</span> &nbsp; Formule : {{OFFER_NAME}}</p>
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:11px 0 0;"><span style="font-weight:900;color:#b78f4c;">2.</span> &nbsp; Modalité : {{PAYMENT_DESCRIPTION}}</p>
<p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#455c70;margin:11px 0 0;"><span style="font-weight:900;color:#b78f4c;">3.</span> &nbsp; Facture n° {{INVOICE_NUMBER}}</p>
</td></tr></table>
<p style="font:400 12px/1.7 Arial,Helvetica,sans-serif;color:#718397;margin:22px 0 0;">Cette facture provient de l’environnement Stripe TEST. Aucune somme réelle n’a été débitée. Ce document n’est pas une facture comptable de votre entreprise.</p>
</td></tr>
<tr><td class="ak-pad" style="background:#091827;padding:28px 39px 31px;">
<p style="margin:0;font:900 17px/1.3 Arial,Helvetica,sans-serif;letter-spacing:1px;color:#ffffff;">AK <span style="color:#d8b16d;">PRIME.</span></p>
<p style="margin:7px 0 0;color:#cad5e2;font:400 13px/1.65 Arial,Helvetica,sans-serif;">La progression ne s'improvise pas.</p>
<p style="margin:18px 0 0;color:#cad5e2;font:400 12px/1.8 Arial,Helvetica,sans-serif;"><a href="https://akprime.fr" style="color:#d8b16d;text-decoration:none;">akprime.fr</a> &nbsp; / &nbsp; <a href="mailto:contact@akprime.fr" style="color:#cad5e2;text-decoration:none;">contact@akprime.fr</a></p>
<p style="margin:14px 0 0;color:#7891a8;font:400 10px/1.6 Arial,Helvetica,sans-serif;">Communication transactionnelle AK PRIME. Aucun mot de passe ne vous sera demandé par e-mail.</p>
</td></tr>
</table></td></tr></table>
</body></html>$akinvoicehtml$)
on conflict(kind) do update set html=excluded.html,updated_at=now();

create or replace function public.send_invited_stripe_test_invoice(
 p_invite_id uuid,p_invoice_number text,p_invoice_url text,p_pdf_url text default null
) returns boolean
language plpgsql security definer set search_path=''
as $function$
declare
 v_inv public.stripe_test_invites%rowtype;
 v_order public.stripe_test_orders%rowtype;
 v_api text;
 v_from text;
 v_html text;
 v_request bigint;
 v_formule text;
 v_payment_label text;
 v_pdf_html text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then
   raise exception 'Accès serveur requis.' using errcode='42501';
 end if;
 if length(coalesce(p_invoice_url,''))>2048
    or p_invoice_url !~ '^https://(invoice|pay)[.]stripe[.]com/' then
   raise exception 'URL facture Stripe TEST invalide.' using errcode='22023';
 end if;
 if p_pdf_url is not null and
    (length(p_pdf_url)>2048 or p_pdf_url !~ '^https://(invoice|pay)[.]stripe[.]com/') then
    raise exception 'PDF Stripe TEST invalide.' using errcode='22023';
 end if;
 if length(coalesce(p_invoice_number,''))>140 then
   raise exception 'Numéro de facture trop long.' using errcode='22023';
 end if;
 select * into v_inv from public.stripe_test_invites where id=p_invite_id for update;
 if v_inv.id is null or v_inv.invoice_email_queued_at is not null
    or v_inv.test_client_id is null then return false;end if;
 select * into v_order from public.stripe_test_orders
 where id=v_inv.stripe_order_id and status='paid' and paid_at is not null
  and test_client_id=v_inv.test_client_id;
 if v_order.id is null then return false;end if;
 select offer_name into v_formule from public.offer_catalog
 where code=v_order.offer_code and active=true;
 v_formule:=coalesce(v_formule,v_order.offer_code);
 v_payment_label:=case when v_order.payment_mode='monthly'
   then 'Paiement mensuel — engagement '||v_order.commitment_months::text||' mois'
   else 'Paiement comptant — engagement '||v_order.commitment_months::text||' mois'
 end;
 select decrypted_secret into v_api from vault.decrypted_secrets
 where name='akprime_resend_api_key' order by created_at desc limit 1;
 select from_address into v_from from private.notification_mail_settings
 where singleton=true and enabled=true;
 select html into v_html from private.akprime_auth_email_templates
 where kind='invoice_test';
 if v_api is null or left(v_api,3)<>'re_' or v_from is null or v_html is null then
   return false;
 end if;
 if p_pdf_url is not null then
   v_pdf_html:='<p style="margin:18px 0 0;text-align:center;"><a href="'||
      private.ak_mail_escape(p_pdf_url)||
      '" style="font:800 14px/1.5 Arial,Helvetica,sans-serif;color:#f2d397;text-decoration:underline;">TÉLÉCHARGER LE PDF DE MA FACTURE TEST</a></p>';
 else
   v_pdf_html:='';
 end if;
 v_html:=replace(v_html,'{{CUSTOMER_GREETING}}',
   private.ak_mail_escape('Bonjour '||initcap(btrim(v_order.full_name))||','));
 v_html:=replace(v_html,'{{OFFER_NAME}}',private.ak_mail_escape(v_formule));
 v_html:=replace(v_html,'{{PAYMENT_DESCRIPTION}}',private.ak_mail_escape(v_payment_label));
 v_html:=replace(v_html,'{{INVOICE_NUMBER}}',
   private.ak_mail_escape(coalesce(nullif(p_invoice_number,''),'STRIPE TEST')));
 v_html:=replace(v_html,'{{INVOICE_LINK}}',private.ak_mail_escape(p_invoice_url));
 v_html:=replace(v_html,'{{PDF_CTA}}',v_pdf_html);
 select net.http_post(
    url:='https://api.resend.com/emails',
    headers:=jsonb_build_object(
      'Authorization','Bearer '||v_api,
      'Content-Type','application/json',
      'Idempotency-Key','akprime-stripe-test-invoice-'||v_inv.id::text
    ),
    body:=jsonb_build_object(
      'from',v_from,
      'to',jsonb_build_array(v_order.email),
      'subject','AK PRIME — Votre facture de démonstration Stripe TEST',
      'html',v_html,
      'text','Bonjour '||v_order.full_name||E',\n\nVotre facture Stripe de démonstration est disponible.\n'||
        'Numéro : '||coalesce(p_invoice_number,'STRIPE TEST')||E'\n'||
        'Consulter : '||p_invoice_url||E'\n'||
        case when p_pdf_url is not null then 'PDF : '||p_pdf_url||E'\n' else '' end||
        E'\nDocument de test : aucun débit réel. Il ne constitue pas une facture comptable AK PRIME.\n'||
        'contact@akprime.fr'
    ),
    timeout_milliseconds:=10000
 ) into v_request;
 if v_request is null then return false;end if;
 update public.stripe_test_invites set invoice_email_queued_at=now()
 where id=p_invite_id;
 return true;
end;
$function$;
revoke all on function public.send_invited_stripe_test_invoice(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.send_invited_stripe_test_invoice(uuid,text,text,text) to service_role;
