# AK PRIME — Audit de pré-lancement
**Contrôle du 27 octobre 2026 · branche `main` · Supabase production `gptvgldboqarfklorjip`**

> Portée : revue statique du code en dépôt, configuration SQL Supabase, services Edge Functions et quelques tests SQL en lecture seule. Aucun paiement, aucune création/modification de client, aucun test interactif réel dans un navigateur. Un composant présent n'est pas déclaré « fonctionnel de bout en bout » sans scénario complet validé.

## 1. Résumé opérationnel

**Décision : NE PAS OUVRIR POUR LES PAIEMENTS RÉELS** à ce stade. Le site vitrine et la base d'accompagnement sont avancés, mais le parcours transactionnel n'est pas actif.

| Domaine | Constat vérifié | Décision |
|---|---|---|
| Catalogue | 7 offres actives en base ; tarifs reconnus par le code vitrine | BASE PRÉSENTE |
| Tarification | `public.quote_offer` retourne un devis sur 3 et 6 mois pour les 7 offres | CONTRÔLE SQL PASSÉ |
| Vitre / détails | Cartes, comparatifs, démos et choix d'offre présents dans `index.html` | À TESTER DANS NAVIGATEUR |
| Souscription | Bouton « Enregistrer ma demande (sans paiement) » ; Edge Function `prepare-checkout-order` crée une commande `draft` | MODE TEST SEULEMENT |
| Stripe | Aucune Edge Function de session Checkout ou webhook dans le projet ; seulement `prepare-checkout-order` et `owner-create-test-client` | **BLOQUANT P0** |
| Création de compte payant | La connexion du site promet l'activation après paiement, mais aucun flux réel de provisioning associé au paiement n'est en place ; formulaire de demande nécessite déjà un utilisateur connecté | **BLOQUANT P0** |
| Factures | Paramètres légaux renseignés, tables et fonctions de facturation manuelle présentes ; 0 facture et 0 transaction de paiement en base au contrôle | AUTOMATISATION NON TESTÉE / P0 |
| Questionnaire initial | Module par pôle / offre, contrôles obligatoires, brouillons, envoi au coach | CODÉ, E2E À VALIDER |
| Back-office / Passeport | 24 modules JS déclarés et tous leurs fichiers présents ; coach, suivis, tests, cycles, visios, macros, sommeil, export | CODE PRÉSENT, E2E À VALIDER |
| Notifications | Notifications en base et e-mail Resend activés ; cron mail toutes les 5 min ; test de réception effectué antérieurement | FONCTIONNEMENT PARTIEL CONFIRMÉ |
| Sauvegardes | Export chiffré AES-GCM / PBKDF2 disponible dans le code | RESTAURATION ET PROCÉDURE À TESTER |
| Adaptation mobile | CSS responsive présent | VISUEL ET PARCOURS MOBILE NON TESTÉS |

## 2. Bloquants avant l'ouverture (P0)

1. **Paiement réel** : connecter un compte Stripe opérationnel, serveur pour session Stripe Checkout, webhooks vérifiés (signature, idempotence, paiements échoués/renouvellements/remboursements), gérer l'engagement de 3/6 mois, réaliser un paiement en mode test puis un contrôle de bout en bout. Aucun paiement réel dans l'état actuel.
2. **Création du compte après paiement** : établir un seul parcours sans contradiction « choisir → consentir → payer → provisionner le compte → lien de création du mot de passe → questionnaire initial → onboarding → accès client » ; gérer doublons, paiements expirés et échecs.
3. **Facture automatique** : confirmer l'enchaînement paiement effectivement encaissé → facture numérotée conforme → PDF consultable → ligne du livre de recettes ; contrôle d'absence de facture en cas d'échec ; remboursements et avoirs.
4. **RC Pro** : preuve de police en vigueur couvrant les activités réellement proposées, garanties/plafonds et exclusions à valider avec l'assureur avant de commencer les prestations.
5. **Médiateur de la consommation** : `AKP_MEDIATOR={name:'',address:'',website:''}` encore vide dans le code public ; convention et mentions à compléter avant contrats consommateurs.
6. **Validation E2E** : test dans le navigateur avec un compte de test non payant puis avec un paiement Stripe test, sur ordinateur et mobile. Réaliser la campagne sur les 7 offres, au moins deux modalités de paiement et les deux engagements.

## 3. Contrôles et anomalies à résoudre (P1)

- **Comptes existants** : 9 dossiers dans `public.clients`, dont 2 explicitement marqués TEST. Parmi les 7 autres, 6 sans `auth_user_id` et sans accès portail ; identifier dossiers historiques ou dossiers à activer, sans les toucher automatiquement. Aucun de ces chiffres ne prouve qu'il existe des clients payants.
- **Documents légaux** : le texte public indique « Netlify » comme hébergeur/outil ; vérifier l'hébergeur réellement en production et corriger les mentions ainsi que la politique de confidentialité. Les mentions légales comportent aussi un placeholder relatif au téléphone professionnel : à examiner selon les obligations applicables, sans publier de numéro privé.
- **Protection des comptes** : l'audit Supabase signale la protection contre les mots de passe compromis désactivée ; configurer selon les possibilités du plan dans Supabase Auth.
- **Fonctions privilégiées** : Supabase relève 37 fonctions SECURITY DEFINER exécutables par des utilisateurs authentifiés. Ce n'est pas 37 failles démontrées : les fonctions `issue_manual_invoice`, `mark_invoice_paid`, `owner_archive_contract_evidence`, `owner_create_client` inspectées comportent des contrôles d'identité/rôle. Revoir exhaustivement les 37, leur `search_path`, leurs permissions et leurs contrôles d'autorisation.
- **`checkout_orders`** : RLS activé sans politique. En parallèle, aucune permission directe SELECT/INSERT n'est donnée au rôle `authenticated` ; cela paraît délibéré pour la réservation aux fonctions serveur, ne pas créer de politique permissive sans besoin.
- **Performance Supabase** : 14 index de clés étrangères suggérés, 16 politiques RLS à optimiser et 9 cas de multiples politiques permissives ; optimisation après clôture des P0.
- **Sauvegarde/récupération** : tester la restauration d'un export chiffré hors production et documenter l'archivage/suppression des pièces conservées.

## 4. Tests de sortie obligatoires (manuels, non exécutés durant cet audit)

- [ ] Visiteur non inscrit : choisir l'une des 7 formules sans blocage de compte, accepter les consentements, obtenir un devis sans divergence de prix.
- [ ] Commander 3 mois au mois, puis 6 mois avec règlement total, avec paiement Stripe **en mode test uniquement**.
- [ ] Voir le webhook valider la commande **une seule fois**, créer/lier le dossier et envoyer le lien d'activation.
- [ ] Activer le compte, compléter chaque questionnaire initial, choisir une date et réserver la visio initiale hors quota.
- [ ] Après publication de test/cycle/macros/retour de coach, voir la bonne information sur le Passeport, la notification, l'e-mail et les permissions par formule.
- [ ] Vérifier que les données d'un autre client sont inaccessibles (RLS, RPC, routes) et que les comptes TEST sont isolés.
- [ ] Générer une facture test cohérente avec le paiement, tester export PDF, archivage et relevé de recettes.
- [ ] Tester les scénarios de refus de paiement, arrêt/renouvellement, remboursement/avoir et échéances.
- [ ] Vérifier toutes les navigations et menus mobile, les exports et les alertes coach.
- [ ] Sauvegarder puis restaurer une copie chiffrée dans un environnement isolé.

## 5. Contrôles SQL effectués (sans écriture)

- Sept offres actives : Forme & Santé Standard 99 € / Renforcé 149 € ; Performance P1 149 €, P2 199 €, P3 299 € ; Mental Particulier 199 €, Sportif 249 €.
- `quote_offer` a répondu pour les 7 codes sur les durées 3 et 6 mois.
- Paramètres de facturation : SIREN, SIRET et adresse juridique présents.
- `checkout_orders` : 0 ; `private.checkout_intents` : 0 ; `invoices` : 0 ; `payment_transactions` : 0.
- `enrollments` : 1 ; les données historiques peuvent être de simulation ou de gestion interne.
- Cron e-mails actif toutes les 5 minutes, envoi autorisé depuis `contact@akprime.fr`.
- Deux Edge Functions actives seulement, aucune fonction Stripe Checkout ou webhook.
- Chargement front : `index.html` charge `contract-archive-secure.js`, qui déclare 24 modules chargés séquentiellement ; chacun est présent dans le dépôt.

## 6. Ce que cet audit ne confirme PAS

Aucun scénario end-to-end de navigateur, paiement Stripe, facture PDF après achat, authentification de vrais clients, test RLS hostile, visio réelle ou restauration de sauvegarde n'a été exécuté. Le navigateur externe d'AK PRIME n'a pas pu être consulté depuis l'outil de lecture public. Les modules présents dans le code peuvent donc encore contenir des dysfonctionnements à l'usage.

## 7. Ordre de reprise recommandé

**Phase 1 :** arrêter le parcours commercial exact, préparer Stripe en mode test et la création de compte post-paiement (P0).

**Phase 2 :** tester en une seule séquence inscription + paiement + preuve + questionnaire + visio + facture + email, sans toucher aux vrais clients.

**Phase 3 :** finaliser RC Pro, médiation, coordonnées légales/hébergeur, audit des droits Supabase, tests mobile et sauvegardes.

**Règle de mise en ligne :** ne pas activer les paiements réels avant que chaque P0 soit validé avec preuve de test.
