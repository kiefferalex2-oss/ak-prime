-- AK PRIME / Email V3 : alignement visuel avec le hero de la page d'accueil.
-- Remplace le HTML des notifications, sans changer les règles d'envoi.
CREATE OR REPLACE FUNCTION private.notification_mail_html(p_subject text, p_items jsonb, p_site_url text, p_first_name text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  item jsonb;
  kind text;
  label text;
  headline text;
  lead text;
  card_label text;
  description text;
  icon_label text;
  cards text:='';
  html text;
  n integer;
  greeting text;
begin
 n:=jsonb_array_length(coalesce(p_items,'[]'::jsonb));
 headline:=case
   when n=1 then coalesce(p_items->0->>'title','Une nouvelle information')
   else n||' nouvelles informations vous attendent' end;
 lead:=case when n=1
   then 'Une nouveauté importante vous attend dans votre accompagnement.'
   else 'Voici les nouveautés importantes de votre accompagnement, regroupées dans un seul message.'
   end;
 greeting:=case when nullif(btrim(coalesce(p_first_name,'')),'') is not null
   then 'Bonjour '||initcap(btrim(p_first_name))||','
   else 'Bonjour,' end;
 for item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
   kind:=coalesce(item->>'kind','');
   label:=coalesce(item->>'title','Nouvelle information');
   card_label:=case kind
    when 'test_published' then 'RÉSULTATS & PROGRESSION'
    when 'feedback_posted' then 'RETOUR DE VOTRE COACH'
    when 'macro_published' then 'NUTRITION'
    when 'cycle_important' then 'PROGRAMMATION'
    when 'content_published' then 'NOUVEAU CONTENU'
    when 'visio_updated' then 'RENDEZ-VOUS'
    when 'assessment_planned' then 'ÉVALUATION'
    when 'invoice_published' then 'FACTURATION'
    when 'visio_24h' then 'RAPPEL DE RENDEZ-VOUS'
    when 'weekly_due' then 'BILAN HEBDOMADAIRE'
    when 'questionnaire_due' then 'DÉBUT D’ACCOMPAGNEMENT'
    when 'renewal_due' then 'RENOUVELLEMENT'
    when 'renewal_confirmed' then 'CONFIRMATION'
    else 'VOTRE ACCOMPAGNEMENT' end;
   description:=case kind
    when 'test_published' then 'Vos nouveaux résultats sont disponibles dans le Passeport, avec votre suivi de progression.'
    when 'feedback_posted' then 'Votre coach a pris connaissance de votre bilan et vous a transmis son retour personnalisé.'
    when 'macro_published' then 'Retrouvez votre budget nutritionnel dans votre espace personnel.'
    when 'cycle_important' then 'Les informations importantes de votre cycle d’entraînement ont changé.'
    when 'content_published' then 'Un nouveau contenu vous attend dans votre espace de suivi.'
    when 'visio_updated' then 'Consultez votre agenda pour connaître les informations actualisées de votre rendez-vous.'
    when 'assessment_planned' then 'Une nouvelle échéance d’évaluation a été programmée pour votre suivi.'
    when 'invoice_published' then 'Votre document de facturation est accessible depuis votre espace.'
    when 'visio_24h' then 'Votre prochaine visio approche. Vous retrouverez l’horaire dans votre agenda.'
    when 'weekly_due' then 'Votre bilan de la semaine est disponible. Prenez quelques minutes pour le compléter.'
    when 'questionnaire_due' then 'Complétez votre questionnaire initial pour préparer le début de votre accompagnement.'
    when 'renewal_due' then 'La fin de votre engagement approche. Indiquez votre choix depuis votre espace.'
    when 'renewal_confirmed' then 'Votre décision a bien été enregistrée dans votre dossier.'
    else 'Connectez-vous à votre espace AK PRIME pour consulter les informations.' end;
   cards:=cards||
    '<tr><td style="padding:0 0 12px 0;">'||
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e3e9f0;border-left:4px solid #bd985e;border-radius:12px;">'||
    '<tr><td style="padding:21px 24px;">'||
    '<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.7px;font-weight:700;color:#a0783b;">'||
      private.ak_mail_escape(card_label)||'</p>'||
    '<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.4;font-weight:700;color:#112c46;">'||
      private.ak_mail_escape(label)||'</p>'||
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#617185;">'||
      private.ak_mail_escape(description)||'</p>'||
    '</td></tr></table></td></tr>';
 end loop;
 html:=$mail$
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>{{SUBJECT}}</title>
<style>
@media screen and (max-width:620px){
 .ak-outer{padding:12px 7px!important}
 .ak-pad{padding-left:22px!important;padding-right:22px!important}
 .ak-title{font-size:32px!important;line-height:1.13!important}
 .ak-art{display:none!important}
 .ak-cta{display:block!important;text-align:center!important}
 .ak-brand{font-size:24px!important}
 .ak-eyebrow{font-size:9px!important;letter-spacing:1.7px!important}
 .ak-hero-cell{padding-bottom:35px!important}
 .ak-body{padding-top:28px!important}
}
</style>
</head>
<body style="padding:0;margin:0;background:#e9eef5;-webkit-text-size-adjust:100%;">
<div style="display:none!important;visibility:hidden;max-width:0;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">{{PREHEADER}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#e9eef5;border-collapse:collapse">
<tr><td class="ak-outer" align="center" style="padding:37px 12px 42px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dae4ef;">

<tr><td style="background:#d8b16d;height:6px;font-size:1px;line-height:6px;">&nbsp;</td></tr>

<tr><td class="ak-pad" style="padding:29px 39px 22px;background:#081421;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td valign="middle">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td style="width:42px;height:42px;background:#d8b16d;border-radius:8px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#081421;font-size:21px;font-weight:900;line-height:42px;">AK</td>
<td style="width:13px;">&nbsp;</td>
<td><div class="ak-brand" style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-weight:900;letter-spacing:1.7px;font-size:26px;line-height:1.05;">PRIME<span style="color:#d8b16d;">.</span></div>
<div style="color:#90a7c1;font-family:Arial,Helvetica,sans-serif;letter-spacing:2.3px;font-weight:700;font-size:8px;line-height:1.75;margin-top:4px;">PRÉPARATION &amp; ACCOMPAGNEMENT</div></td>
</tr></table>
</td>
<td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;color:#c3ceda;font-size:9px;line-height:1.7;letter-spacing:1.8px;font-weight:750;">PERFORMANCE<br>PROGRESSION<br><span style="color:#d8b16d;">ÉQUILIBRE</span></td>
</tr></table>
</td></tr>

<tr><td class="ak-pad ak-hero-cell" style="padding:27px 39px 40px;background-color:#0d1b2c;background-image:radial-gradient(circle at 90% 10%,#173962 0%,#0d1b2c 58%);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding-bottom:25px;border-top:1px solid #2e3d52;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:23px;"><tr>
<td style="height:8px;width:8px;border-radius:50%;background:#2f66f6;font-size:1px;">&nbsp;</td>
<td width="11">&nbsp;</td>
<td class="ak-eyebrow" style="font-family:Arial,Helvetica,sans-serif;color:#d8b16d;font-weight:900;font-size:10px;letter-spacing:2.4px;line-height:1.6;">VOTRE ESPACE AK PRIME</td>
</tr></table></td></tr>
<tr>
<td valign="top">
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;color:#bfd0df;font-size:14px;line-height:1.6;">{{GREETING}}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding:8px 13px;border-radius:5px;border:1px solid #987b50;background:#2a2b27;font-family:Arial,Helvetica,sans-serif;color:#edca88;font-size:10px;font-weight:900;letter-spacing:1.2px;line-height:1.55;">{{CATEGORY}}</td>
</tr></table>
</td>
<td class="ak-art" align="right" valign="top" width="104" style="width:104px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="height:84px;width:84px;border:1px solid #46648b;border-radius:50%;text-align:center;vertical-align:middle;background:#142943;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:36px;line-height:1;font-weight:900;color:#d8b16d;">AK</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2px;color:#91a9c5;line-height:2.2;font-weight:900;">PRIME</div>
</td></tr></table>
</td>
</tr></table>

<h1 class="ak-title" style="margin:24px 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:43px;line-height:1.13;letter-spacing:-1.4px;font-weight:900;color:#ffffff;">{{HEADLINE}}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 19px;"><tr>
<td width="66" height="4" style="width:66px;height:4px;background:#d8b16d;border-radius:3px;font-size:1px;line-height:4px;">&nbsp;</td>
<td width="8">&nbsp;</td>
<td width="20" height="4" style="width:20px;height:4px;background:#2f66f6;border-radius:3px;font-size:1px;line-height:4px;">&nbsp;</td>
</tr></table>
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#c6d6e6;">{{LEAD}}</p>
<table role="presentation" cellspacing="0" cellpadding="0" width="100%">
<tr><td style="background:#d8b16d;border-radius:9px;text-align:center;box-shadow:0 5px 0 #80653e;">
<a class="ak-cta" href="{{SITE_URL}}" style="display:block;background:#d8b16d;padding:18px 16px;border-radius:9px;color:#091927;text-decoration:none;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.35;font-weight:900;letter-spacing:0.1px;">CONSULTER MA NOTIFICATION &nbsp; &#8594;</a>
</td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;color:#90a6be;font-size:11px;line-height:1.6;letter-spacing:1px;font-weight:700;margin:21px 0 0;">UN OBJECTIF. UN PLAN. DES RÉSULTATS.</p>
</td></tr>

<tr><td style="height:7px;font-size:1px;line-height:7px;background:#2f66f6;">&nbsp;</td></tr>

<tr><td class="ak-pad ak-body" style="padding:36px 39px 32px;background:#ffffff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td width="31" valign="top" style="padding:3px 0 16px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:30px;height:30px;background:#edf2ff;border-radius:7px;color:#2f66f6;font-size:17px;font-weight:900;text-align:center;line-height:30px;">&#10003;</td></tr></table>
</td>
<td valign="top" style="padding:6px 0 16px 12px;font-family:Arial,Helvetica,sans-serif;color:#162c44;letter-spacing:1.5px;font-size:12px;font-weight:900;">{{DETAIL_HEADING}}</td></tr>
{{CARDS}}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:25px;background:#eff4fa;border-collapse:separate;border-spacing:0;border-radius:11px;"><tr>
<td style="width:4px;background:#d8b16d;font-size:1px;">&nbsp;</td>
<td style="padding:17px 20px;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:900;color:#1d3854;line-height:1.6;margin:0 0 5px;">Confidentialité &amp; accompagnement</p>
<p style="font-family:Arial,Helvetica,sans-serif;color:#687d90;font-size:12px;line-height:1.75;margin:0;">Vos données personnelles ne sont pas affichées dans cet e-mail. Elles restent accessibles dans votre espace client sécurisé.</p>
</td></tr></table>
</td></tr>

<tr><td class="ak-pad" style="padding:29px 39px 32px;background:#091827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:900;letter-spacing:1px;color:#ffffff;">AK <span style="color:#d8b16d;">PRIME.</span></td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;color:#cad5e2;font-size:13px;line-height:1.65;padding-top:7px;">La progression ne s'improvise pas.</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;padding-top:18px;">
<a href="{{SITE_URL}}" style="color:#d8b16d;text-decoration:none;font-weight:800;">akprime.fr</a>
<span style="color:#59738c;"> &nbsp; / &nbsp; </span>
<a href="mailto:contact@akprime.fr" style="color:#cad5e2;text-decoration:none;">contact@akprime.fr</a>
</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;padding-top:16px;color:#7891a8;">Notification de suivi AK PRIME. Ceci n'est pas une communication publicitaire.</td></tr>
</table></td></tr>

</table></td></tr></table>
</body></html>
$mail$;
 html:=replace(html,'{{SUBJECT}}',private.ak_mail_escape(coalesce(p_subject,'Notification AK PRIME')));
 html:=replace(html,'{{PREHEADER}}',private.ak_mail_escape(headline));
 html:=replace(html,'{{GREETING}}',private.ak_mail_escape(greeting));
 html:=replace(html,'{{HEADLINE}}',private.ak_mail_escape(headline));
 html:=replace(html,'{{LEAD}}',private.ak_mail_escape(lead));
 html:=replace(html,'{{SITE_URL}}',private.ak_mail_escape(coalesce(p_site_url,'https://akprime.fr')));
 if n=1 then
   cards:='<tr><td style="padding:24px 25px;border-radius:11px;border:1px solid #dce5ee;border-left:5px solid #2f66f6;background:#f8fafd;">'||
   '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#455c70;font-size:14px;line-height:1.75;">'||
   private.ak_mail_escape(description)||'</p></td></tr>';
 end if;
 html:=replace(html,'{{CATEGORY}}',private.ak_mail_escape(
     case when n=1 then card_label else 'PLUSIEURS MISES À JOUR' end));
 html:=replace(html,'{{DETAIL_HEADING}}',
     case when n=1 then 'CE QUE CELA CHANGE POUR VOUS' else 'LES INFORMATIONS À RETROUVER' end);
 html:=replace(html,'{{CARDS}}',cards);
 return html;
end $function$;
revoke all on function private.notification_mail_html(text,jsonb,text,text) from public,anon,authenticated;
