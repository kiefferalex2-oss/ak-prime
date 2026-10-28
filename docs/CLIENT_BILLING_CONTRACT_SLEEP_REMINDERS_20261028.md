# AK PRIME — Correctifs parcours client du 28 octobre 2026

## Factures dans l'espace client
Les factures de tests Stripe sont volontairement isolées des factures comptables `public.invoices`. La fonction `client-test-invoices` authentifie le client avec son jeton Supabase, vérifie son dossier `is_test=true`, retrouve les seules commandes Stripe TEST payées reliées à `test_client_id`, puis liste les factures Stripe payées pour les clients Stripe rattachés. Elle renvoie uniquement les liens Stripe de consultation et les PDF.

La rubrique « Mes factures » est complétée par `akp-test-invoices-client.js` ; les exemples de factures fictives ne remplacent plus les documents réellement émis.

## Preuves contractuelles coach
La RPC `owner_stripe_test_consent_evidence()` expose au seul propriétaire une synthèse des consentements horodatés des achats en sandbox. Elle est fusionnée avec la RPC de production `owner_contract_evidence()`, clairement affichée « TEST — simulation », exportable JSON et imprimable PDF. Les consentements de TEST ne sont pas des contrats signés de production et restent distincts des preuves réelles.

## Sommeil avant activation
`private.ak_sleep_entry_allowed(client_id,date)`, les politiques RLS et le trigger `ak_sleep_activation_guard` bloquent toute écriture client tant que:
- le statut n'est pas `active`,
- la date de démarrage de Paris n'est pas atteinte,
- le coach n'a pas achevé la procédure d'activation,
- l'offre n'inclut pas l'agenda détaillé (Performance P3).

`akp-client-essentials.js` affiche un message de verrouillage explicatif avant la date ou activation.
Un test SQL avec le rôle authentifié d'un compte P3 en `onboarding` a vérifié le refus de toute saisie.

## Rappels AK PRIME
`private.ak_client_reminder_dispatch()` crée des envois personnalisés, idempotents et sécurisés uniquement pour les accompagnements actifs et commencés :
- Sommeil : chaque jour à 20h Paris, si la nuit du jour manque, Performance P3 seulement.
- Bilan hebdomadaire : vendredi à 20h Paris, si la réponse du vendredi manque.

Les envois sont du HTML AK PRIME avec prénom et lien sécurisé vers l'onglet « Accompagnement » ou « Bilan ». Aucun champ médical n'est envoyé. Les adresses `@example.com` sont exclues. Annulation avant envoi si le client a rempli ou si le suivi est en pause/terminé ; chaque échéance génère au plus un e-mail accepté. Les e-mails sont envoyés par Resend, les détails d'acceptation restent dans `private.ak_client_reminder_delivery`.

L'ancien rappel de bilan à 18h a été retiré de `private.notification_mail_reminders()`.

## Contrôles et limites
- Deux commandes Stripe TEST payées et associées à des dossiers disposent d'une référence client Stripe ; les factures PDF existent dans le sandbox.
- Trois preuves TEST payées sont visibles via la RPC en usurpation contrôlée du rôle propriétaire, et invisibles pour un rôle client.
- Les deux aperçus d'e-mails de rappel, envoyés à l'adresse du propriétaire avec mention « SIMULATION », ont reçu un HTTP 200 de Resend ; la réception en boîte n'est pas encore prouvée.
- Le rendu complet des pages client et coach doit être vérifié après publication Cloudflare, avec rechargement Ctrl+F5.
- Le paiement de production est inchangé / désactivé ; aucun nouvel encaissement ni facture comptable réelle n'est créé par ces changements.

Fichiers :
- `akp-test-invoices-client.js` et `contract-archive-secure.js`
- `akp-client-essentials.js`, `index.html`
- `supabase/functions/client-test-invoices/index.ts`
- migrations 051–055.
