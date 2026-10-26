# AK PRIME — activation des e-mails de notification

La file d'attente et le déclenchement sont déjà déployés dans Supabase.
**L'envoi est intentionnellement désactivé tant qu'aucun fournisseur ne dispose
d'une clé valide et que le domaine expéditeur n'a pas été vérifié.**

## 1. Configurer le service d'e-mails

1. Créer/configurer le compte [Resend](https://resend.com).
2. Vérifier le domaine `akprime.fr` dans Resend avec les entrées DNS demandées
   (SPF/DKIM et autres entrées éventuellement nécessaires).
3. Créer une clé API limitée à l'envoi depuis le domaine vérifié.
4. Dans le projet Supabase AK PRIME, exécuter dans le SQL Editor :

```sql
select vault.create_secret(
  'REMPLACER_PAR_LA_CLE_RESEND',
  'akprime_resend_api_key',
  'Envoi transactionnel AK PRIME'
);
```

Ne pas placer cette clé dans GitHub, les sources JavaScript ou la conversation.

## 2. Activer uniquement après un test du domaine

Les envois sont préparés depuis `notifications@akprime.fr`.
Après avoir confirmé que le domaine et l'adresse peuvent bien envoyer dans Resend :

```sql
update private.notification_mail_settings
set enabled=true, enabled_at=now()
where singleton=true;
```

La tâche `akprime-notification-mails` s'exécute toutes les cinq minutes.
Les événements rapprochés sont réunis dans un seul e-mail, normalement après
12 minutes. Les événements urgents (visios, retours, factures, confirmations)
ont un délai de 2 minutes, plus le passage du traitement planifié.

Les messages contiennent uniquement des titres génériques et un lien sécurisé
vers https://akprime.fr ; aucune mesure de santé ni réponse de questionnaire
n'est envoyée par e-mail. Les comptes de test sont exclus des envois.

## E-mails retenus

- Questionnaire initial à compléter : rappel unique.
- Bilan hebdomadaire : un rappel lorsque le bilan est disponible le vendredi
  après 18 h (heure de Paris), s'il n'est pas rempli.
- Réponse du coach au bilan.
- Nouveaux résultats de tests (groupés).
- Changement important du cycle : nom, période ou statut.
- Budget nutritionnel publié.
- Nouveau contenu publié pour le client.
- Changement de rendez-vous, ou réservation.
- Nouvelle évaluation planifiée.
- Visio dans les 24 heures : un seul rappel, pas de mail 3 heures avant.
- Renouvellement : un rappel sous 14 jours et une confirmation unique du choix.
- Nouvelle facture.

**Sans e-mail** : simple enrichissement du Passeport, modifications mineures,
rappels de visio à 3 heures et saisies de sommeil du client (ces dernières
restent dans la cloche coach).

## Vérification

```sql
select enabled, from_address, enabled_at
from private.notification_mail_settings;

select status, count(*) from private.notification_mail_batches
group by status;

select jobname, schedule, active from cron.job
where jobname='akprime-notification-mails';
```

Pour mettre immédiatement l'envoi en pause :

```sql
update private.notification_mail_settings
set enabled=false where singleton=true;
```

Remarques : il s'agit de messages transactionnels liés à l'accompagnement,
pas d'une newsletter. Les e-mails dépendront de la délivrabilité du fournisseur
et peuvent occasionner des frais selon le volume et le forfait de Resend.
Les modifications de la logique SQL sont versionnées dans
`supabase/migrations/030_akprime_notification_emails.sql`.
