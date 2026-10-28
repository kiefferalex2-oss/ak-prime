# AK PRIME — Test complet du parcours de souscription (sandbox uniquement)

## Mise à jour du 28 octobre 2026 — test DIRECT depuis akprime.fr

**Le lien privé n'est plus nécessaire.** Depuis https://akprime.fr/ en navigation privée, un visiteur peut désormais choisir n'importe quelle formule et cliquer sur « Payer avec Stripe (TEST) ». Aucun compte AK PRIME préexistant n'est exigé. Le client renseigne nom, e-mail, consentements et éventuelle date souhaitée. La commande se fait via `public-checkout-test` avec l'action `direct_create`, qui crée une invitation interne à usage unique puis une session Checkout dans le bac à sable Stripe, sans utiliser une clé de production.

Les paiements sont strictement fictifs ; les visiteurs voient une mention de **MODE TEST**. L'activation publique est **automatiquement limitée à 7 jours** à compter de la migration 042, avec une limite globale de 20 essais par 24 h et de 2 essais par e-mail par 24 h. La désactivation se fait en plaçant `enabled_until=now()` dans `private.public_stripe_test_access`.

À la réussite du paiement, le retour AK PRIME vérifie le statut webhook. Il déclenche l'invitation e-mail Supabase Auth, crée un dossier `is_test=true` en onboarding, puis récupère la facture de simulation Stripe et l'envoi par Resend lorsqu'ils sont disponibles. L'e-mail et le PDF **restent à vérifier en conditions réelles** ; aucune facture n'est inscrite dans la comptabilité AK PRIME.

L'ancien parcours « enregistrement de demande » et son obligation de connexion préalable ont été supprimés du formulaire public dans ce mode de simulation. L'ouverture des paiements réels nécessite une implémentation et une validation distinctes.

Le reste du document ci-dessous décrit l'ancien parcours propriétaire par lien, qui demeure disponible en complément mais n'est **plus nécessaire** pour le test demandé.


## Périmètre
Le site public reste sans encaissement réel. Pour simuler une nouvelle souscription, seul le propriétaire connecté peut créer un lien temporaire de 3 heures sur https://akprime.fr/stripe-test.html.

Ce lien donne accès aux **vraies cartes des 7 offres** sur https://akprime.fr/?akp_test=... ; le nouveau client peut sélectionner 3/6 mois et paiement mensuel/comptant, renseigner coordonnées, accepter les conditions et passer par Stripe Checkout TEST.

## Exécution
1. Se connecter comme propriétaire à /stripe-test.html et cliquer sur **Créer un lien de parcours complet**.
2. Cliquer sur **Copier le lien** ; ouvrir une fenêtre privée (Ctrl + Maj + N), coller l'URL.
3. Sur le vrai site, sélectionner une carte d'offre, choisir engagement et paiement, puis compléter le formulaire. Utiliser une adresse e-mail *réelle que l'on possède* mais **non déjà utilisée dans Supabase Auth AK PRIME**.
4. Utiliser uniquement une carte TEST Stripe (4242 4242 4242 4242 ; date future et CVC fictif) ; n'utiliser aucune carte bancaire réelle.
5. Au retour sur AK PRIME, attendre la confirmation de l'événement webhook. Cliquer sur **Vérifier mon paiement TEST** si Stripe n'a pas encore confirmé.
6. Une fois confirmé, le serveur appelle l'invitation Supabase Auth à l'adresse saisie, puis provisionne un **dossier is_test=true**, status=onboarding, avec la formule et l'engagement choisis. Le mail d'invitation dépend de la configuration d'e-mail Supabase Auth et du redirect autorisé vers /reinitialiser-mot-de-passe.html.
7. Cliquer sur le lien de l'e-mail, définir son mot de passe, se connecter sur akprime.fr et remplir le questionnaire initial, réserver une visio, puis vérifier le Passeport et le back-office.
8. Stripe crée une **facture Stripe TEST** : pour le paiement comptant via invoice_creation ; pour l'abonnement par Stripe Billing. Au retour, un lien vers sa version hébergée et le PDF est présenté si disponible. Resend est sollicité par la fonction SQL send_invited_stripe_test_invoice (envoi d'un e-mail explicitement étiqueté TEST, sans valeur comptable), à condition que la facture soit déjà finalisée et payée.

## Sécurité et limites
- Le lien propriétaire est un secret aléatoire de 256 bits, haché SHA-256 en base ; durée 3 h, une commande maximum, 8 invitations max par 24 heures et par propriétaire.
- La fonction public-checkout-test vérifie côté serveur le prix de public.quote_offer contre les prices Stripe de l'environnement de test, sans faire confiance au montant du navigateur.
- Seul un paiement confirmé par un webhook Stripe signé peut activer l'étape de création du compte. Les souscriptions réelles ne sont pas affectées.
- Aucun enregistrement n'est créé dans public.invoices, public.payment_transactions ou public.revenue_entries pour cette simulation.
- Les e-mails d'invitation proviennent de Supabase Auth. L'e-mail de facture de simulation provient de Resend, avec lien Stripe hébergé ; vérifier la réception réelle, y compris indésirables.
- L'environnement de test Stripe et les comptes fictifs ne constituent pas une homologation de production. Avant lancement, construire et valider séparément le tunnel public réel, les renouvellements, la comptabilité et l'envoi de factures légalement conformes.
- Ne pas exposer publiquement les liens à usage unique et ne pas utiliser une adresse d'un client réel pour un test.

## Fichiers
- index.html et akp-public-test-flow.js
- stripe-test.html (génération du lien propriétaire)
- supabase/functions/public-checkout-test/index.ts
- supabase/functions/stripe-test-webhook/index.ts (confirmation de paiement signée, déjà présent)
- supabase/migrations/040_public_offer_test_invites.sql
- supabase/migrations/041_stripe_test_invoice_email.sql

## État à vérifier manuellement
La configuration et le code sont déployés, mais aucune nouvelle souscription n'a encore été exécutée par un navigateur visiteur depuis une carte publique. Les invitations e-mail et la facture de test doivent être vérifiées avec un nouvel achat fictif ; ne pas affirmer que tout est validé avant ces étapes.
