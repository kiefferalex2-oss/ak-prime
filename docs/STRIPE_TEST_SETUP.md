# AK PRIME — Stripe : banc de validation isolé

**Déployé le 27 octobre 2026. Test uniquement, aucun paiement réel.**

Le nouveau banc Stripe est accessible à https://akprime.fr/stripe-test.html (connexion propriétaire requise).

## Connexion des secrets, à effectuer personnellement

1. Sur https://dashboard.stripe.com/test/apikeys, récupérer la clé SECRÈTE du mode test (commençant par sk_test_).
2. Dans Supabase https://supabase.com/dashboard/project/gptvgldboqarfklorjip/settings/functions → Edge Functions → Secrets, créer STRIPE_SECRET_KEY avec la valeur de la clé de test.
3. Dans le même écran créer AKP_STRIPE_TEST_ENABLED avec la valeur true.
4. Dans Stripe mode TEST, Developers / Workbench → Webhooks / Event destinations : créer un endpoint HTTPS à : https://gptvgldboqarfklorjip.supabase.co/functions/v1/stripe-test-webhook
5. Événements requis : checkout.session.completed et checkout.session.expired.
6. Copier le secret de signature whsec_... de la destination Stripe vers Supabase Edge Functions → Secrets, sous STRIPE_WEBHOOK_SECRET.

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
- Stripe Checkout utilise les produits/prix calculés sur le serveur et pas le montant déclaré par le navigateur.
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

## Après le premier test réussi

Il restera à connecter la confirmation de paiement au provisionnement d’un vrai compte client, à automatiser les factures et paiements récurrents, et à tester l’ensemble du parcours avant ouverture live.

**Attention : le déploiement des fonctions et les tests SQL ne prouvent pas que Stripe Checkout fonctionne avec ton propre compte tant que les deux secrets Stripe ne sont pas configurés et le paiement TEST effectué.**
