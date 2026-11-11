# Agent de prospection AK PRIME

## Fonctionnement

Interface propriétaire : `https://akprime.fr/prospection/` (même compte AK PRIME).
Les tables Supabase sont protégées par RLS : ni les visiteurs, ni les clients, ni
les coachs ne peuvent lire les contacts. Les accès privés ne sont jamais fournis
au navigateur. L'interface publique ne contient aucune donnée de prospect.

Le workflow GitHub `AK PRIME - Agent de prospection` passe au plus une fois par
heure, à la minute 23 (passage indicatif, GitHub peut le retarder). La recherche
est limitée à une réservation par jour, cinq candidats maximum ; une erreur après
réservation ne relance pas la recherche payante le même jour. Il utilise l'API
OpenAI Responses et son outil de recherche web. Les API sont facturées séparément
de ChatGPT ; prévoir un plafond de dépenses dans le compte API.

Les publications doivent dater de moins de 31 jours, citer un besoin explicite et
être accessibles publiquement en HTML. Le code vérifie que l'extrait figure sur
la page et que l'adresse figure sur la page de contact. Les résultats invérifiables,
paywalls et pages rendues uniquement en JavaScript sont écartés, même si le modèle
les mentionne. Le propriétaire vérifie la date et la pertinence avant autorisation.
La recherche peut donc ne rien retourner. Aucune donnée fictive n'est insérée.

Les mails sont envoyés via SMTP OVH (TLS 465) et les réponses suivies par IMAP
OVH (TLS 993). Les messages restent non lus dans la boîte. Seuls les en-têtes sont
consultés. Toute réponse liée au message suspend la prospection ; un objet STOP
est marqué comme opposition. Le modèle ne lit pas les mails entrants et ne leur
répond pas. Aucun automatisme Instagram/Messenger n'est connecté.

Un contact autorisé reçoit **un seul mail**. Pas de relance automatique dans cette
première version. Une adresse est unique dans toute la base. Les réservations
d'envoi sont transactionnelles et comptent dans le plafond quotidien, y compris
les erreurs. Après un résultat SMTP incertain, aucun nouvel essai automatique.
La mise en pause empêche les prochaines réservations ; elle ne peut pas rappeler
un mail déjà remis au serveur. En cas d'échec de lecture IMAP, tous les envois
du passage sont bloqués.

## Installation et activation

Le SQL est versionné dans la migration `prospection_agent` et doit être appliqué
au projet Supabase AK PRIME avant d'utiliser l'interface. L'agent et les envois
sont désactivés par défaut. Installer le workflow sur la branche `main` pour
permettre les passages planifiés. Aucun nouveau serveur n'est requis : le site
reste sur Cloudflare Pages, le traitement tourne sur GitHub Actions et les
données restent dans le projet Supabase existant.

Dans GitHub → dépôt AK PRIME → Settings → Secrets and variables → Actions →
New repository secret, ajouter :

| Nom exact du secret | Valeur à saisir dans GitHub uniquement |
| --- | --- |
| `PROSPECTION_SUPABASE_SERVICE_KEY` | Clé serveur `service_role` du projet Supabase AK PRIME, ou clé serveur secrète compatible Data API. Ne jamais utiliser cette clé dans du code public. |
| `PROSPECTION_OPENAI_API_KEY` | Clé API OpenAI d'un projet avec facturation et budget configurés. |
| `PROSPECTION_OVH_PASSWORD` | Mot de passe de la boîte `contact@akprime.fr` ; identifiant et serveurs sont déjà fixés dans le code. |

La clé Supabase serveur est très privilégiée : réserver l'écriture du dépôt et
les modifications de workflow aux personnes de confiance. Les secrets ne sont
pas transmis aux workflows de pull requests. Ne coller aucune clé dans une issue,
une PR, un chat, un fichier versionné ou une capture d'écran.

1. Lancer Actions → Agent de prospection → Run workflow → `check` : vérifie
   uniquement l'accès aux tables, sans connexion mail et sans coût IA.
2. Dans `/prospection/`, activer l'agent et la recherche, garder les envois désactivés.
3. Lancer le mode `research`, puis examiner les vrais résultats dans l'interface.
4. Pour un test réel, ajouter une adresse de test que vous contrôlez, avec
   un accord explicite et une preuve, une source vérifiée et un message test.
5. Autoriser uniquement ce message, régler le plafond quotidien à 1, activer
   les envois et lancer `run` durant la plage lundi–vendredi 9 h–18 h Paris.
6. Vérifier la réception, répondre à ce mail, relancer `run`, constater le statut
   « Réponse reçue ». Ne pas activer la campagne si ce parcours n'est pas validé.
7. Examiner et autoriser les messages destinés aux prospects. Le passage suivant
   les envoie dans la limite réglée. Pour arrêter : bouton « Tout mettre en pause ».

Les envois SMTP ne sont pas automatiquement copiés dans le dossier « Envoyés »
Zimbra : la réservation, le Message-ID et le statut d'envoi sont suivis en base.
« Envoyé » signifie accepté par OVH, pas réception garantie. Un retour d'erreur
ou une réponse automatique peut nécessiter un traitement manuel. GitHub peut
désactiver les tâches planifiées d'un dépôt public après 60 jours sans activité.
Le dernier passage est visible dans l'interface et dans GitHub Actions.

## Cadre du ciblage

Particuliers : pas d'envoi sans accord préalable documenté pour la prospection
par e-mail. Une adresse publique ou une recherche de coach ne vaut pas consentement.
Clubs : message lié à l'activité de la structure, source indiquée, possibilité
simple de répondre STOP. Les prospects refusant le contact sont conservés en
opposition et ne peuvent pas être réactivés dans le module. Les droits d'accès,
rectification et suppression se gèrent manuellement via contact@akprime.fr.

Référence : https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel

## Tests

`python3 -m unittest discover -s tests/prospection -v`

Tests sans connexion réseau, sans envoi ni coût API : éligibilité/consentement,
preuves et dates, format des messages, arrêt sur échec IMAP, conservation des
états incertains. Compléter par les contrôles RLS sur le projet et le test réel
décrit ci-dessus une fois les secrets connectés.
