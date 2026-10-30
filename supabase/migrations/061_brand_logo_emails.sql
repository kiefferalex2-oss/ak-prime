-- Mise en conformité visuelle e-mails AK PRIME (30 octobre 2026).
-- Les fonctions ci-dessous sont les versions verifiees actives sur Supabase.
-- Le logo est une version PNG issue des paths exacts du logo vectoriel valide,
-- disponible sur https://akprime.fr/assets/ak-prime-wordmark-email.png .
-- Synchronise les trois modèles de bienvenue, facture test et alerte nouveau client.
-- Remplace l'ancien AK carre / PRIME texte uniquement quand il est encore présent.
UPDATE private.akprime_auth_email_templates
SET html=replace(
  regexp_replace(html,
    '(?s)<td style="width:42px;height:42px;[^>]*>AK</td>.*?PRÉPARATION &amp; ACCOMPAGNEMENT</div></td>',
    '<td valign="middle"><a href="https://akprime.fr/" style="text-decoration:none;"><img src="https://akprime.fr/assets/ak-prime-wordmark-email.png?v=20261030-email-png" alt="AK PRIME" width="227" height="30" style="display:block;width:227px;max-width:100%;height:auto;border:0;color:#ffffff;font:bold 24px Arial,sans-serif;" /></a></td>',
    'g'
  ),
  'https://akprime.fr/assets/ak-prime-wordmark-white-gold.svg?v=20261030-email',
  'https://akprime.fr/assets/ak-prime-wordmark-email.png?v=20261030-email-png'
),
updated_at=now()
WHERE kind IN ('coach_new_client','invite_test','invoice_test');

CREATE OR REPLACE FUNCTION private.notification_mail_html(p_subject text, p_items jsonb, p_site_url text, p_first_name text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  n integer := 0;
  it jsonb;
  kind text;
  title_text text;
  category text;
  hero_top text;
  explanation text;
  action_text text;
  link_url text;
  first_name text;
  cards text := '';
  html text;
  first_detail text := '';
BEGIN
  n := jsonb_array_length(coalesce(p_items,'[]'::jsonb));
  it := case when n>0 then p_items->0 else '{}'::jsonb end;
  kind := coalesce(it->>'kind','');
  title_text := coalesce(nullif(btrim(it->>'title'),''),'Une nouvelle information vous attend');
  link_url := case when p_site_url ~ '^https://[a-zA-Z0-9./_-]+$' then p_site_url else 'https://akprime.fr' end;
  first_name := nullif(btrim(coalesce(p_first_name,'')),'');

  category := case kind
    when 'test_published' then 'RÉSULTATS & PROGRESSION'
    when 'feedback_posted' then 'LE RETOUR DE VOTRE COACH'
    when 'macro_published' then 'VOTRE SUIVI NUTRITIONNEL'
    when 'cycle_important' then 'PROGRAMMATION'
    when 'content_published' then 'NOUVEAU CONTENU'
    when 'visio_updated' then 'VOTRE RENDEZ-VOUS'
    when 'assessment_planned' then 'ÉVALUATION'
    when 'invoice_published' then 'FACTURATION'
    when 'visio_24h' then 'RAPPEL DE RENDEZ-VOUS'
    when 'weekly_due' then 'BILAN HEBDOMADAIRE'
    when 'sleep_reminder' then 'AGENDA DE SOMMEIL'
    when 'payment_failed' then 'PAIEMENT REFUSÉ'
    when 'payment_paid' then 'PAIEMENT CONFIRMÉ'
    when 'questionnaire_due' then 'DÉBUT D’ACCOMPAGNEMENT'
    when 'renewal_due' then 'RENOUVELLEMENT'
    when 'renewal_confirmed' then 'CONFIRMATION'
    else 'VOTRE ACCOMPAGNEMENT' end;

  hero_top := case kind
    when 'test_published' then 'Votre progression se construit.'
    when 'feedback_posted' then 'Votre coach est à vos côtés.'
    when 'macro_published' then 'Chaque détail compte.'
    when 'cycle_important' then 'Votre programme évolue.'
    when 'content_published' then 'Votre suivi avance.'
    when 'visio_updated' then 'Un rendez-vous à ne pas manquer.'
    when 'assessment_planned' then 'Place à la prochaine étape.'
    when 'invoice_published' then 'Votre dossier est à jour.'
    when 'visio_24h' then 'On se retrouve bientôt.'
    when 'weekly_due' then 'Faisons le point.'
    when 'sleep_reminder' then 'Votre récupération compte.'
    when 'payment_failed' then 'Un paiement nécessite votre attention.'
    when 'payment_paid' then 'Votre règlement est confirmé.'
    when 'questionnaire_due' then 'Tout commence ici.'
    when 'renewal_due' then 'Et si on continuait ensemble ?'
    when 'renewal_confirmed' then 'C’est enregistré.'
    else 'La progression continue.' end;

  explanation := case kind
    when 'test_published' then 'Retrouvez vos nouveaux résultats dans le Passeport AK PRIME et suivez votre évolution au fil des évaluations.'
    when 'feedback_posted' then 'Votre coach vous a transmis un retour personnalisé. Retrouvez-le dans votre espace de suivi.'
    when 'macro_published' then 'Votre budget nutritionnel personnalisé est prêt dans votre espace client.'
    when 'cycle_important' then 'Votre cycle d’entraînement a été mis à jour pour accompagner votre progression.'
    when 'content_published' then 'Un nouveau contenu a été ajouté à votre espace client AK PRIME.'
    when 'visio_updated' then 'Un changement concerne votre rendez-vous. Retrouvez toutes les informations dans votre agenda.'
    when 'assessment_planned' then 'Une nouvelle évaluation est planifiée. Consultez les échéances dans votre espace.'
    when 'invoice_published' then 'Un nouveau document de facturation est disponible dans votre espace.'
    when 'visio_24h' then 'Votre rendez-vous approche. Vérifiez les informations dans votre agenda.'
    when 'weekly_due' then 'Votre bilan de la semaine vous attend. Vos retours nous aident à adapter votre suivi.'
    when 'sleep_reminder' then 'Votre nuit n’est pas encore enregistrée. Complétez votre agenda de sommeil pour permettre le suivi de votre récupération.'
    when 'payment_failed' then 'Le prélèvement de votre mensualité n’a pas abouti. Vérifiez votre moyen de paiement via Stripe ou contactez AK PRIME pour régulariser.'
    when 'payment_paid' then 'Le règlement de votre mensualité a bien été enregistré. Vous pouvez consulter les informations de facturation dans votre espace.'
    when 'questionnaire_due' then 'Votre questionnaire initial est prêt. Complétez-le pour commencer votre accompagnement.'
    when 'renewal_due' then 'La fin de votre engagement approche. Consultez les possibilités de renouvellement.'
    when 'renewal_confirmed' then 'Votre choix de renouvellement a bien été enregistré.'
    else 'Une nouvelle information est disponible dans votre espace personnel sécurisé.' end;

  action_text := case kind
    when 'test_published' then 'DÉCOUVRIR MES RÉSULTATS'
    when 'feedback_posted' then 'LIRE LE RETOUR DU COACH'
    when 'weekly_due' then 'REMPLIR MON BILAN'
    when 'sleep_reminder' then 'REMPLIR MON AGENDA DE SOMMEIL'
    when 'payment_failed' then 'CONSULTER MA FACTURATION'
    when 'payment_paid' then 'CONSULTER MA FACTURATION'
    when 'questionnaire_due' then 'COMPLÉTER MON QUESTIONNAIRE'
    when 'macro_published' then 'CONSULTER MA NUTRITION'
    when 'visio_updated' then 'VOIR MON RENDEZ-VOUS'
    when 'visio_24h' then 'VOIR MON RENDEZ-VOUS'
    when 'renewal_due' then 'CONSULTER MON RENOUVELLEMENT'
    else 'ACCÉDER À MON ESPACE' end;

  if n > 1 then
    hero_top := 'Votre accompagnement avance.';
    title_text := n::text || ' nouvelles informations vous attendent.';
    category := 'VOTRE ACTUALITÉ AK PRIME';
    explanation := 'Plusieurs nouveautés importantes ont été réunies dans cet e-mail. Consultez-les en toute simplicité.';
    action_text := 'DÉCOUVRIR MES NOUVEAUTÉS';
    for it in select value from jsonb_array_elements(p_items) loop
      cards := cards ||
      '<tr><td style="padding:0 0 10px;">'||
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#1b344f;border:1px solid #344b65;border-radius:13px;">'||
      '<tr><td style="padding:15px 19px;border-left:4px solid #d8b16d;border-radius:12px;">'||
      '<p style="margin:0;font:800 15px/1.5 Arial,Helvetica,sans-serif;color:#ffffff;">'||
      private.ak_mail_escape(coalesce(it->>'title','Nouvelle information'))||
      '</p></td></tr></table></td></tr>';
    end loop;
  else
    cards :=
      '<tr><td style="padding:0;background:transparent;">'||
      ''||
      '<p style="margin:0;color:#e3ebf4;font:400 15px/1.75 Arial,Helvetica,sans-serif;">'||
      private.ak_mail_escape(explanation)||'</p></td></tr>';
  end if;

  html := $mail$
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>{{SUBJECT}}</title>
<style>
@media screen and (max-width:640px) {
.ak-wrap{padding:12px 6px!important}
.ak-pad{padding-left:24px!important;padding-right:24px!important}
.ak-title{font-size:31px!important;line-height:1.16!important}
.ak-brand{font-size:26px!important}
.ak-subbrand{font-size:9px!important}
.ak-hero{padding-top:32px!important;padding-bottom:23px!important}
.ak-detail{padding-left:21px!important;padding-right:21px!important}
.ak-button{font-size:14px!important;letter-spacing:0!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#ebf0f6;-webkit-text-size-adjust:100%">
<div style="display:none!important;visibility:hidden;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px">{{PREHEADER}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#ebf0f6;">
<tr><td class="ak-wrap" align="center" style="padding:35px 12px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;border-collapse:separate;border-spacing:0;border-radius:18px;overflow:hidden;border:1px solid #dbe4ef;background:#0b1727;">

<!-- EN-TÊTE : L'IDENTITÉ VISUELLE, SANS CONTENU PUBLICITAIRE -->
<tr><td style="background:#d8b16d;height:5px;font-size:1px;line-height:5px;">&nbsp;</td></tr>
<tr><td class="ak-pad" style="padding:28px 39px;background:#091521;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td valign="middle" class="ak-brand"><a href="https://akprime.fr/" style="text-decoration:none;"><img src="https://akprime.fr/assets/ak-prime-wordmark-email.png?v=20261030-email-png" alt="AK PRIME" width="216" height="29" style="display:block;width:216px;max-width:100%;height:auto;border:0;color:#ffffff;font:bold 24px Arial,sans-serif;" /></a></td>
<td class="ak-subbrand" valign="middle" align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.65;letter-spacing:2px;font-weight:800;color:#9aaec3;">ESPACE CLIENT</td>
</tr></table>
</td></tr>

<!-- UN SEUL SUJET : LA NOTIFICATION -->
<tr><td class="ak-pad ak-hero" style="padding:42px 39px 28px;background:#0d1b2c;background-image:linear-gradient(138deg,#0b1727,#10223a 72%,#193456);">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 23px;">
<tr><td style="border:1px solid #806e4d;border-radius:20px;background:#232a2c;padding:8px 13px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5;letter-spacing:1px;font-weight:900;color:#e7c17c;">{{CATEGORY}}</td></tr>
</table>
<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#b9c8da;">{{GREETING}}</p>
<h1 class="ak-title" style="margin:0 0 26px;color:#f7f9fd;font-family:Arial,Helvetica,sans-serif;font-size:37px;line-height:1.18;letter-spacing:-1px;font-weight:900;">{{HEADLINE}}</h1>

<!-- CARTE DE NOTIFICATION : COMME LES ENCADRÉS DU SITE -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#192f4b;background-image:linear-gradient(145deg,#1c3554,#132740);border:1px solid #39506a;border-collapse:separate;border-spacing:0;border-radius:19px;">
<tr><td class="ak-detail" style="padding:25px 27px 26px;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;letter-spacing:1.5px;color:#d8b16d;font-weight:900;margin:0 0 12px;">{{DETAIL_HEADING}}</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
{{CARDS}}
</table>
</td></tr>
</table>

<!-- CTA ADAPTÉ À LA NOTIFICATION -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">
<tr><td style="border-radius:11px;background:#d3ab62;text-align:center;">
<a class="ak-button" href="{{SITE_URL}}" style="display:block;background:#d3ab62;border-radius:11px;padding:18px 16px;font-family:Arial,Helvetica,sans-serif;color:#091521;font-size:15px;line-height:1.45;font-weight:900;letter-spacing:.1px;text-decoration:none;">{{CTA}} &nbsp; &#8594;</a>
</td></tr></table>
</td></tr>

<!-- PIED DE PAGE DISCRET -->
<tr><td class="ak-pad" style="background:#091521;border-top:1px solid #253850;padding:26px 39px 30px;">
<p style="margin:0 0 12px;color:#aec0d0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;">Cet e-mail vous informe d'une mise à jour liée à votre accompagnement. Vos informations personnelles restent accessibles dans votre espace sécurisé.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;">
<a href="{{SITE_URL}}" style="color:#d8b16d;text-decoration:none;font-weight:800;">akprime.fr</a></td>
<td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;">
<a href="mailto:contact@akprime.fr" style="color:#cbd7e4;text-decoration:none;">contact@akprime.fr</a></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>
$mail$;

  html := replace(html,'{{SUBJECT}}',private.ak_mail_escape(coalesce(p_subject,'AK PRIME')));
  html := replace(html,'{{PREHEADER}}',private.ak_mail_escape(title_text));
  html := replace(html,'{{CATEGORY}}',private.ak_mail_escape(category));
  html := replace(html,'{{HERO_TOP}}',private.ak_mail_escape(hero_top));
  html := replace(html,'{{HEADLINE}}',private.ak_mail_escape(title_text));
  html := replace(html,'{{GREETING}}',private.ak_mail_escape(
    case when first_name is null then 'Bonjour,' else 'Bonjour '||initcap(first_name)||',' end));
  html := replace(html,'{{DETAIL_HEADING}}',
    case when n>1 then 'VOS DERNIÈRES INFORMATIONS' when kind='sleep_reminder' then 'VOTRE AGENDA DE SOMMEIL' when kind='payment_failed' then 'RÉGULARISATION DU PAIEMENT' when kind='payment_paid' then 'CONFIRMATION DE RÈGLEMENT' when kind='weekly_due' then 'VOTRE BILAN HEBDOMADAIRE' else 'INFORMATIONS IMPORTANTES' end);
  html := replace(html,'{{CARDS}}',cards);
  html := replace(html,'{{CTA}}',private.ak_mail_escape(action_text));
  html := replace(html,'{{SITE_URL}}',private.ak_mail_escape(link_url));
  return html;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_stripe_live_client_invite(p_order_id uuid, p_link text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o record; k text; sender text; req bigint; body text; html text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Unauthorized' using errcode='42501';end if;
 select * into o from public.stripe_live_checkout_orders where id=p_order_id for update;
 if o.id is null or o.status<>'provisioned' or o.client_id is null or o.auth_user_id is null then return false;end if;
 if o.invite_email_queued_at is not null then return true;end if;
 if p_link !~ '^https://[a-zA-Z0-9.-]+[.]supabase[.]co/auth/v1/verify[?]' or length(p_link)>4000 then raise exception 'Invitation URL invalid';end if;
 select decrypted_secret into k from vault.decrypted_secrets where name='akprime_resend_api_key' order by created_at desc limit 1;
 select from_address into sender from private.notification_mail_settings where singleton=true and enabled=true;
 if k is null or sender is null then raise exception 'Email unavailable';end if;
 html:='<html lang="fr"><body style="margin:0;background:#edf1f6;font:15px Arial,sans-serif"><table role="presentation" style="max-width:580px;margin:auto;background:#102238;color:#ffffff;border-radius:14px;padding:30px"><tr><td><p style="margin:0 0 18px;"><a href="https://akprime.fr/" style="text-decoration:none;"><img src="https://akprime.fr/assets/ak-prime-wordmark-email.png?v=20261030-email-png" alt="AK PRIME" width="225" height="30" style="display:block;width:225px;height:auto;border:0;color:#ffffff;font:bold 23px Arial,sans-serif;" /></a></p><h1>Bienvenue dans ton accompagnement</h1><p>Bonjour '||private.ak_mail_escape(o.full_name)||',</p><p>Ton paiement a bien été confirmé. Active ton espace client pour remplir ton questionnaire initial et préparer ton démarrage.</p><p><a style="display:inline-block;background:#d8b16d;color:#102238;text-decoration:none;padding:16px;border-radius:8px;font-weight:bold" href="'||private.ak_mail_escape(p_link)||'">ACTIVER MON ESPACE CLIENT</a></p><p>Si tu n’es pas à l’origine de cette demande, contacte contact@akprime.fr.</p><p style="font-size:12px;color:#c4cfdf">AK PRIME · https://akprime.fr</p></td></tr></table></body></html>';
 select net.http_post(url:='https://api.resend.com/emails',
  headers:=jsonb_build_object('Authorization','Bearer '||k,'Content-Type','application/json','Idempotency-Key','akp-live-invite-'||o.id::text),
  body:=jsonb_build_object('from',sender,'to',jsonb_build_array(o.email),'subject','AK PRIME — Active ton espace client','html',html,'text','Bonjour '||o.full_name||E',\nTon paiement AK PRIME est confirmé. Active ton espace : '||p_link),timeout_milliseconds:=10000) into req;
 if req is null then return false;end if;
 update public.stripe_live_checkout_orders set invite_email_queued_at=now(),invite_email_request_id=req where id=o.id;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION private.dispatch_stripe_live_provision_alerts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o record;token text;sender text;email text;rid bigint;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='akprime_resend_api_key' order by created_at desc limit 1;
 select from_address into sender from private.notification_mail_settings where singleton=true and enabled=true;
 select p.email into email from public.profiles p where p.role='owner' and p.email is not null order by p.created_at limit 1;
 if token is null or sender is null or email is null then return;end if;
 insert into private.stripe_live_provision_alerts(order_id)
 select id from public.stripe_live_checkout_orders where status='paid' and client_id is null
 and paid_at<now()-interval '5 minutes'
 on conflict do nothing;
 for o in select a.order_id,a.attempts,b.full_name,b.email as client_email
 from private.stripe_live_provision_alerts a join public.stripe_live_checkout_orders b on b.id=a.order_id
 where a.status='pending' and (a.last_attempt_at is null or a.last_attempt_at<now()-interval '15 minutes')
 limit 20 for update of a skip locked loop
 begin
 select net.http_post(url:='https://api.resend.com/emails',
 headers:=jsonb_build_object('Authorization','Bearer '||token,'Content-Type','application/json',
 'Idempotency-Key','akp-live-provision-failed-'||o.order_id::text),
 body:=jsonb_build_object('from',sender,'to',jsonb_build_array(email),
 'subject','[ACTION REQUISE] AK PRIME — Compte client payé non activé',
 'html','<html lang="fr"><body style="margin:0;background:#e8edf4;padding:24px;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;border-radius:14px;background:#0e2034;color:#eef4f9"><tr><td style="padding:30px"><img src="https://akprime.fr/assets/ak-prime-wordmark-email.png?v=20261030-email-png" width="227" height="30" alt="AK PRIME" style="display:block;width:227px;max-width:100%;height:auto;border:0;color:white"><h1 style="color:#dbb46d;font-size:23px;margin-top:28px">Intervention requise</h1><p>Un paiement a bien été confirmé mais le compte client n''a pas été créé.</p><p>Vérifie Stripe et Supabase avant d''intervenir sur la commande.</p><a href="https://akprime.fr/" style="color:#dfbc77">Accéder à AK PRIME</a></td></tr></table></body></html>',
 'text','Un paiement de production a été confirmé, mais le dossier client n’a pas été créé. Client : '||o.full_name||' ('||o.client_email||'). Consulte Stripe et Supabase avant toute intervention. Commande : '||o.order_id::text),
 timeout_milliseconds:=10000) into rid;
 update private.stripe_live_provision_alerts set request_id=rid,status='sending',attempts=attempts+1,last_attempt_at=now() where order_id=o.order_id;
 exception when others then
 update private.stripe_live_provision_alerts set attempts=attempts+1,last_attempt_at=now(),status=case when attempts>=3 then 'failed' else 'pending' end where order_id=o.order_id;
 end;
 end loop;
 update private.stripe_live_provision_alerts a set
 status=case when r.status_code between 200 and 299 then 'sent' when attempts>=4 then 'failed' else 'pending' end
 from net._http_response r where a.request_id=r.id and a.status='sending';
 update private.stripe_live_provision_alerts a set status=case when a.attempts>=4 then 'failed' else 'pending' end,request_id=null
 where a.status='sending' and a.last_attempt_at<now()-interval '12 minutes'
 and not exists(select 1 from net._http_response r where r.id=a.request_id);
end;
$function$;
