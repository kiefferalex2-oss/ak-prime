# AK PRIME — Nouvelle simulation et facturation personnalisée (28 octobre 2026)

## Nouveau paiement TEST

L'ancien ticket `?ticket=...` reste associé à sa commande pour le suivi sécurisé de la confirmation et de la facture. Il est **à usage unique** : il ne doit jamais être employé pour créer une nouvelle souscription.

Sur le site public, le bouton **Payer avec Stripe (TEST)** utilise maintenant systématiquement l'action `direct_create` : chaque clic crée une nouvelle invitation interne et une nouvelle session Checkout sandbox. Les anciens retours Stripe restent consultables sans empêcher de nouveaux paiements. Le panneau de retour offre **Recommencer une nouvelle souscription TEST**, qui navigue vers `https://akprime.fr/#offres`, sans ticket précédent.

Le site public reste en **mode test**, aucun paiement réel. Une date limite à 7 jours et des quotas sont définis par `private.public_stripe_test_access`.

## E-mail de facture

- Modèle HTML : `supabase/templates/invoice-test.html`
- Déploiement : `supabase/migrations/046_invoice_test_branded_email.sql`
- Expéditeur : `AK PRIME <contact@akprime.fr>` via les paramètres actuels Resend et Vault.
- Contenu : salutation nominative, formule, durée d'engagement et modalité de paiement, numéro Stripe TEST, lien de consultation, lien PDF si disponible, et mention sans débit réel.
- Visuel : bleu nuit et doré, logo typographique AK PRIME, bouton principal comme les mails de notifications.
- Envoi : uniquement après webhook signé, compte TEST créé, facture Stripe TEST au statut **paid**, une seule mise en file par invitation. Le marqueur `invoice_email_queued_at` prouve une demande d'envoi à Resend, pas sa livraison.
- Aucun document ni écriture comptable réelle AK PRIME n'est créé.

## Facture Stripe (PDF)

Dans **l'environnement de test AK PRIME**, la configuration de marque de Stripe a été mise à jour :
- Bleu nuit `#0D1B2C` (couleur principale)
- Doré `#D8B16D` (secondaire et bouton Checkout)
- Police Checkout : Inter

Lors de la nouvelle commande, Stripe reçoit un *Customer* TEST en français avec un pied de page et deux champs sur les factures : `Prestation : Accompagnement AK PRIME` et `Document : SIMULATION / STRIPE TEST`. Cela concerne particulièrement **la première facture des abonnements mensuels**, qui est finalisée immédiatement par Stripe. Pour les paiements comptants, `invoice_creation.invoice_data` donne en plus une description et un footer personnalisés.

**Limites :**
- Les factures déjà finalisées ne récupèrent pas rétroactivement ces champs.
- Stripe n'est pas un éditeur PDF arbitraire ; la mise en page reste celle des factures Stripe, personnalisée par les couleurs et les champs.
- Aucun fichier de logo image n'était présent dans le dépôt. Ajouter l'icône et le logo officiel dans les **Branding Settings** Stripe TEST, si souhaité, pour les afficher sur les factures. La simple typographie AK PRIME fonctionne déjà dans l'e-mail.
- Pour la production, les mentions légales de facturation, l'identité de l'émetteur, SIRET et le régime de TVA doivent être vérifiés avant de rendre une facture comptable.

## Vérification effectuée

- Fonction `public-checkout-test` v8 ACTIVE, `verify_jwt=false`, secrets Stripe test uniquement.
- Une requête de nouvelle souscription mensuelle a renvoyé HTTP 200 et une URL Checkout TEST.
- Le nouveau client Stripe TEST possède bien les champs de facture, le pied de page et la langue française.
- Le modèle HTML `invoice_test` est présent en base et la fonction d'envoi n'est exécutable que par `service_role`.
- La réception par mail et le PDF après un paiement fictif **restent à tester dans le navigateur**. Aucun paiement fictif supplémentaire n'a été effectué durant ces vérifications.
