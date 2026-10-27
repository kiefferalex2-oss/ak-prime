# AK PRIME — Stripe : banc de validation isolé

**Mis à jour le 27 octobre 2026. Test uniquement, aucun paiement réel.**

Le nouveau banc Stripe est accessible à https://akprime.fr/stripe-test.html (connexion propriétaire requise).

## État constaté le 27 octobre 2026

- Sept produits Stripe et 28 tarifs Stripe **test** créés et vérifiés dans l'environnement **« environnement de test AK PRIME »** (`acct_1UV85r5iH3zuK1xr`), avec quatre variantes par offre (3/6 mois × mensuel/comptant), correspondant à `public.quote_offer`.
- `stripe-test-checkout` déployée en version 3 ; utilise `lookup_keys` et contrôle chaque tarif Stripe contre la valeur du devis Supabase avant Checkout.
- `stripe-test-webhook` déployée en version 2 ; prend en charge les paiements confirmés, expirés, différés réussis et refusés.
- Endpoint Stripe du bon environnement **« environnement de test AK PRIME »** créé et activé : `we_1UVBDO5iH3zuK1xrCS936lrS`.
- L'ancien webhook `we_1UVAqf52NfuzDJzTpmQJi9ND` a été créé dans le *mode test du compte AK PRIME* (`acct_1UVASx52NfuzDJzT`), environnement différent. Ne pas mélanger les secrets/API keys et les prix entre ces deux environnements.
- **Non vérifié** : présence de la clé API secrète dans Supabase, du secret de signature `whsec_...`, d'`AKP_STRIPE_TEST_ENABLED=true`, puis réussite d'un paiement test de bout en bout.

## Connexion des secrets, à effectuer personnellement

1. Sur le tableau de bord Stripe, **dans « environnement de test AK PRIME »**, récupérer la clé secrète API de CE sandbox (type `sk_test_...`). Ne pas utiliser une clé du mode test de l'autre compte AK PRIME.
2. Dans Supabase https://supabase.com/dashboard/project/gptvgldboqarfklorjip/settings/functions → Edge Functions → Secrets, créer STRIPE_SECRET_KEY avec la valeur de la clé de test.
3. Dans le même écran créer AKP_STRIPE_TEST_ENABLED avec la valeur true.
4. Dans **« environnement de test AK PRIME »** (sandbox `acct_1UV85r5iH3zuK1xr`), l'endpoint existe déjà : `we_1UVBDO5iH3zuK1xrCS936lrS` → `https://gptvgldboqarfklorjip.supabase.co/functions/v1/stripe-test-webhook` (ne pas en créer un deuxième).
5. Événements déjà configurés : `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
6. Dans Stripe, ouvrir cette destination sandbox et révéler **son** secret de signature `whsec_...` ; le copier dans Supabase Edge Functions → Secrets sous `STRIPE_WEBHOOK_SECRET`. Ne pas utiliser le secret de l'ancien webhook du compte AK PRIME.

Ne jamais transmettre les clés dans la conversation ou les déposer dans GitHub.

## Test du paiement

1. Ouvrir https://akprime.fr/stripe-test.html ; se connecter au compte propriétaire AK PRIME.
2. Choisir parmi les sept offres et les engagements 3 ou 6 mois, comptant ou mensuel.
3. Renseigner des données de démonstration et valider les consentements.
4. Payer avec une carte de TEST Stripe (exemple officiel : 4242 4242 4242 4242, date future et CVC fictif).
5. Au retour, utiliser « Actualiser le statut du webhook » : le paiement ne devient confirmé que si Stripe a envoyé son webhook signé.
6. Tester aussi une annulation, un paiement refusé et les deux types de paiement.

## Architecture et sécurité

- Supabase Edge Functions stripe-test-checkout (JWT requis, rôle propriétaire, tarifs recalculés côté serveur avec public.quote_offer) et stripe-test-webhook (signature vérifiée, événement Stripe LIVE rejeté).
- Stripe Checkout utilise les prix du catalogue Stripe TEST trouvés par `lookup_key` et vérifiés contre les prix calculés en base via `public.quote_offer`. Aucun montant soumis par le navigateur n'est utilisé.
- Mode paiement : paiement comptant en une fois. Mode mensuel : abonnement Stripe TEST, annulé automatiquement à échéance de 3 ou 6 mois par le webhook, avec respect du prix mensuel calculé en base.
- Données dans les tables isolées public.stripe_test_orders et public.stripe_test_webhook_events, avec RLS et aucun privilège de lecture pour anon/authenticated.
- Le mode test est bloqué sans un secret sk_test_ et AKP_STRIPE_TEST_ENABLED=true.
- Aucun dossier client réel, aucune facture, aucun paiement réel et aucune écriture comptable n’est créé ici.
- Le bouton public existant « Enregistrer ma demande (sans paiement) » reste volontairement inchangé.

## Éléments du dépôt

- stripe-test.html
- supabase/functions/stripe-test-checkout/index.ts
- supabase/functions/stripe-test-webhook/index.ts
- supabase/migrations/037_stripe_isolated_test_checkout.sql
- supabase/migrations/038_stripe_test_consent_evidence.sql
- supabase/config.toml

## Parcours complet de démonstration après paiement (ajout du 27/10/2026)

- Ouvrir `https://akprime.fr/stripe-test.html` en étant connecté comme propriétaire.
- La page retrouve automatiquement le dernier paiement Stripe TEST confirmé par webhook, même s'il date de la session précédente.
- Cliquer sur « Créer le compte client de démonstration » : `owner-create-test-client` vérifie l'état payé, crée une identité Supabase fictive `@example.com`, puis la RPC `owner_provision_paid_test_client` associe une seule fois le dossier fictif à la commande.
- Le dossier est marqué `is_test=true` et `status=onboarding`, et dispose du bon pôle, de la bonne formule, de l'engagement 3/6 mois et d'un accès au portail. L'onboarding commence au **questionnaire initial**, sans être validé d'avance.
- Copier immédiatement le mot de passe temporaire affiché une seule fois. En navigation privée, ouvrir `https://akprime.fr/`, se connecter au compte fictif, remplir le questionnaire initial, réserver la visio, puis examiner Passeport, tests, notifications et espace coach.
- Aucune vraie facture, aucune entrée dans le livre de recettes ni aucune adresse client réelle ne doit être créée par ce module.
- Les données du sandbox Stripe sont indépendantes de la facturation de production. Ce test **ne remplace pas** le développement et la validation du tunnel commercial public ouvert aux nouveaux clients.

**Contrôle effectué :** une commande Stripe TEST confirmée était présente en base et non encore reliée à un compte fictif. Le clic de création du compte puis le parcours dans le navigateur restent à tester.

## Après le premier test réussi

Il restera à connecter la confirmation de paiement au provisionnement d’un vrai compte client, à automatiser les factures et paiements récurrents, et à tester l’ensemble du parcours avant ouverture live.

**Attention : le déploiement des fonctions et les tests SQL ne prouvent pas que Stripe Checkout fonctionne avec ton propre compte tant que les deux secrets Stripe ne sont pas configurés et le paiement TEST effectué.**
