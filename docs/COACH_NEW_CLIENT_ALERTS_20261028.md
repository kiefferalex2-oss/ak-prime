# AK PRIME — nouveaux clients : alertes propriétaire et e-mails

## Comportement
Lorsqu'un dossier est créé dans `public.clients`, y compris après validation d'un paiement Stripe TEST (et une invitation Auth réussie), le trigger `akprime_coach_new_client_alert` enregistre une seule alerte par propriétaire dans `public.coach_new_client_events` et une tâche d'e-mail par propriétaire dans `private.coach_new_client_mail_outbox`.

Le traitement se fait **sur INSERT, jamais lors d'une mise à jour**. Réutiliser un compte TEST existant pour un autre paiement fictif ne crée donc pas de fausse notification « nouveau client ». Tous les anciens dossiers sont inchangés : il n'y a pas de rattrapage ni d'envoi rétroactif.

## Cloche du back-office
- Le coach propriétaire charge ses propres nouvelles alertes via `coach_new_client_events`.
- Une alerte non lue est visible dans la cloche : « Nouveau client — Prénom Nom », avec pôle, offre et mention [TEST] si applicable.
- « Ouvrir » affiche la fiche du client, onglet Onboarding. La notification disparaît après lecture comme les notifications existantes.
- La table est protégée par RLS : `owner_id=auth.uid()` et rôle `owner`; les clients et anonymes ne peuvent ni lire ni créer ces alertes.
- La publication Realtime `supabase_realtime` inclut la table ; le back-office écoute les nouvelles alertes et recharge la liste. L'affichage après reconnexion prend aussi en compte les alertes manquées.

## E-mail propriétaire
- Expéditeur : `AK PRIME <contact@akprime.fr>` via la clé Resend existante dans Vault ; destinataire : l'adresse du profil propriétaire.
- Modèle : `private.akprime_auth_email_templates(kind='coach_new_client')`.
- Style : bleu nuit/doré, en-tête AK PRIME, bouton « Ouvrir le dossier client ».
- Données communiquées : nom, pôle/offre, statut onboarding, lien `https://akprime.fr/?coach_client=<uuid>`. Aucune donnée de santé ni donnée sensible de questionnaire.
- Les dossiers de simulation sont clairement indiqués [TEST] et « aucun paiement réel ».
- La tâche `akprime-coach-new-client-mails` s'exécute chaque minute ; en cas d'échec fournisseur, des tentatives de nouvel envoi sont prévues. L'état `sent` prouve une acceptation par le fournisseur, pas la réception en boîte de réception.

## Validation
- Migration de notifications installée : `049_coach_new_client_notifications.sql`.
- Realtime activé : `050_realtime_coach_new_clients.sql`.
- Back-office GitHub : `index.html`, chargement, cloche, ouverture fiche et lien depuis l'e-mail.
- Test SQL : insertion temporaire d'un dossier TEST sous transaction, preuve de l'événement et de la tâche mail, puis rollback. Aucun dossier, e-mail, ni alerte factice conservé.
- Vérifié : un propriétaire existe avec e-mail ; les notifications par Resend sont activées ; le cron est actif.
- À tester en conditions réelles : réception de l'e-mail et actualisation de la cloche pendant la prochaine inscription (aucun nouvel e-mail envoyé durant le contrôle).

## Portée
Le parcours public actuel est un **sandbox Stripe TEST**. Ce mécanisme de notification fonctionne pour les nouveaux dossiers produits dans la base, mais cela ne signifie pas que le paiement de production est activé.
