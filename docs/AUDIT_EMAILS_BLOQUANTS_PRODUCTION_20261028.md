# Audit fiabilité des e-mails — 28 octobre 2026

## Constat confirmé
- Les deux aperçus de rappel précédents ont été acceptés par Resend (HTTP 200), mais ont été adressés à la boîte propriétaire `al***pm@gmail.com`, différente de l'adresse du dernier achat de simulation `ki***x2@gmail.com`.
- Le compte propriétaire utilise une clé Resend **send-only** : la tentative de GET `/emails/{id}` retourne HTTP 401 « This API key is restricted to only send emails ». Le tableau de bord AK PRIME ne peut donc pas confirmer la livraison au destinataire à partir de cette clé.
- `akprime-notification-mails` échouait toutes les cinq minutes : la variable PL/pgSQL `b record` masquait l'alias SQL `b`. La migration 056 renomme l'alias en `batch`. Appel direct réussi, et tâche cron de 17 h 05 UTC confirmée `succeeded`.
- `akprime-sleep-weekly-reminders` est actif et a également un dernier `succeeded`. Les critères pour envoyer un rappel sommeil aujourd'hui ne sont satisfaits par **aucun** client possédant une adresse e-mail éligible, ce qui explique le zéro rappel réel.
- Aucun échec message connu ni e-mail de rappel réel en attente à l'heure du contrôle.

## Changements
- Migration `056_fix_notification_mail_dispatch_alias.sql` : corrige le job de notifications.
- Migrations `057_owner_email_system_health.sql` + `058_owner_mail_health_last_24h_failures.sql` : contrôle propriétaire des 3 tâches cron, des erreurs des dernières 24 h, des files en attente et des messages acceptés.
- `index.html` : rubrique **Surveillance des e-mails** sur le dashboard propriétaire, avec bouton de rafraîchissement. Une acceptation fournisseur n'est jamais présentée comme une livraison.
- Un e-mail de diagnostic strictement étiqueté `[SIMULATION]` a été envoyé à l'adresse de l'achat TEST le plus récent, sans modifier de nuit ni de bilan. Resend a renvoyé HTTP 200 et un identifiant de message. **La réception reste à confirmer par l'utilisateur.**

## Bloquants à lever avant lancement de la production
1. Vérifier dans Resend → **Emails** les trois identifiants envoyés lors des aperçus. Statuts à examiner : `delivered`, `failed`, `bounced`, `suppressed`, `delivery_delayed`. Le statut `sent` n'est pas une preuve de livraison. Voir https://resend.com/changelog/email-events-timeline.
2. Intégrer les événements `email.delivered`, `email.failed`, `email.bounced`, `email.suppressed` dans une route webhook **avec signature vérifiée**, et journaliser les états réels associés aux messages.
3. Vérifier domaine d'envoi et réputation (SPF, DKIM, DMARC) ainsi que les suppressions ; inspecter les boîtes spam, promotions et tous les messages.
4. Valider avec deux adresses accessibles : invitation, facture, rappel sommeil, rappel bilan et notification coach. Tester explicitement erreurs fournisseur, absence de connexion, pauses, dates futures, doublons et reprogrammations.
5. Conserver les paiements de production désactivés jusqu'à validation effective des parcours critiques. La disponibilité parfaite n'est pas garantie mais les échecs doivent être détectés et traités sans perte silencieuse.

## Recommandations d'exploitation
- Ne pas considérer `pg_net` HTTP 200 comme « reçu dans la boîte ».
- Ne pas utiliser une clé secrète d'envoi à plus de privilèges simplement pour pouvoir lire les messages dans la base : préférer webhook signé et journalisation limitée.
- Ne pas déclencher de rappels pour les clients encore en onboarding, en pause, ou dont la date de début n'est pas atteinte.
- Surveiller au minimum quotidiennement la rubrique fiabilité pendant les tests.
