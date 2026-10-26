-- AK PRIME · E-mails transactionnels V6 : suppression des deux traits décoratifs bleu et doré.
-- Sans portrait, slogan, carte méthode ou texte commercial. Catégorie, titre et CTA dynamiques.
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
    when 'questionnaire_due' then 'Votre questionnaire initial est prêt. Complétez-le pour commencer votre accompagnement.'
    when 'renewal_due' then 'La fin de votre engagement approche. Consultez les possibilités de renouvellement.'
    when 'renewal_confirmed' then 'Votre choix de renouvellement a bien été enregistré.'
    else 'Une nouvelle information est disponible dans votre espace personnel sécurisé.' end;

  action_text := case kind
    when 'test_published' then 'DÉCOUVRIR MES RÉSULTATS'
    when 'feedback_posted' then 'LIRE LE RETOUR DU COACH'
    when 'weekly_due' then 'REMPLIR MON BILAN'
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
<td valign="middle" class="ak-brand" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;letter-spacing:0.6px;line-height:1.2;font-weight:900;color:#ffffff;">AK <span style="color:#d8b16d">PRIME</span></td>
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
    case when n>1 then 'VOS DERNIÈRES INFORMATIONS' else 'CE QUE VOUS DEVEZ SAVOIR' end);
  html := replace(html,'{{CARDS}}',cards);
  html := replace(html,'{{CTA}}',private.ak_mail_escape(action_text));
  html := replace(html,'{{SITE_URL}}',private.ak_mail_escape(link_url));
  return html;
END;
$function$;
revoke all on function private.notification_mail_html(text,jsonb,text,text) from public,anon,authenticated;
