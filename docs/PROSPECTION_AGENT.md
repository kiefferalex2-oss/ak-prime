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


## Extension agent commercial : publications, supports et suggestions

La recherche couvre les trois pôles et les clubs, associations, professionnels
et particuliers. Une activité récente pertinente peut justifier une prise de
contact B2B ; ne pas présenter cette hypothèse comme une demande explicite.

Le mode `creative` prépare, au maximum une fois par jour, deux textes adaptés
à Facebook/Instagram et une suggestion de développement. Les trois pôles sont
alternés. Les supports graphiques sont composés automatiquement en bleu nuit
et or, au format JPEG 1080 × 1350, à partir des textes courts. Le titre et les
points sont modifiables. Un texte trop long est refusé, pas coupé silencieusement.
Aucun témoignage ni chiffre de performance inventé ; pas de tarif collectif supposé.

Le studio /prospection/ affiche la légende exacte, la destination et le visuel.
La validation conserve une copie exacte du contenu (`approved_snapshot`). Toute
modification du texte, du visuel ou du réseau annule la validation. Le visuel est
stocké dans le bucket public dédié `akprime-promotion` uniquement lors de la
validation ; aucun prospect ni document client ne doit être déposé dans ce bucket.
Les suggestions retenues ne sont jamais exécutées automatiquement et n’autorisent
ni dépense ni campagne publicitaire.

### Publication : connexion encore nécessaire

À la vérification du 11 novembre 2026, seules GA4 et Search Console sont connectées
à Windsor. Le workflow GitHub prépare les contenus et les e-mails ; **il ne publie
pas lui-même les contenus sociaux**. La validation dans le studio signifie
« contenu approuvé », pas « publication effectuée ».

Facebook Pages et Instagram disposent d’actions de publication via Windsor.ai.
Une fois les comptes AK PRIME connectés et vérifiés, le relais de publication
pourra lire la file approuvée et utiliser ces actions. Ce relais n’est pas encore
planifié tant que ces connexions manquent. L’envoi de messages privés arbitraires
Instagram/Messenger n’est pas disponible dans les actions actuellement découvertes.
Ne jamais simuler la publication ou marquer un élément publié sans résultat réel.

Contrat du relais de publication après connexion :
1. Vérifier le compte connecté correspondant exactement à la destination AK PRIME.
2. Lire le contenu approuvé et comparer chaque champ à `approved_snapshot`.
3. Réserver une seule fois avec `prospection_claim_publication(p_id)` ; si la file
   est en pause, si le contenu a changé ou s’il est déjà réservé, ne rien envoyer.
4. Lire le schéma de l’action Windsor avant utilisation. Pour Facebook, utiliser
   `facebook_organic/create_photo_post` avec `caption` et `image_url`. Pour
   Instagram, utiliser `instagram/create_image_post` avec `caption` et `image_url`.
5. Appeler l’action une fois avec le texte et le JPEG approuvés, sans modification.
6. Enregistrer `published` et l’URL réelle retournée seulement en cas de succès.
   En cas d’incertitude, enregistrer `uncertain` et ne pas réessayer automatiquement.
   Si une authentification ou une confirmation est demandée, arrêter avant l’action.

La connexion des réseaux ne remplace pas les trois secrets GitHub nécessaires
au traitement e-mail et à la génération IA. L’agent reste en pause à l’installation.


## Fonctionnement final : visuels du propriétaire, validation, diffusion

La création automatique est désactivée. Le bouton « Préparer une publication »
permet au propriétaire d’ajouter le texte convenu, choisir Facebook AK PRIME ou
Instagram akprime.fr et charger son propre visuel. Le navigateur prépare un JPEG
et en montre l’aperçu exact. La validation conserve le texte et l’URL du média ;
les modifications annulent cette validation. Les anciennes publications de
présentation non validées ont été archivées, pas publiées.

Un relais ChatGPT planifié vérifie la file une fois par heure. Il publie au plus
une version validée par passage, sur les comptes AK PRIME explicitement reliés,
après réservation atomique. Il n’invente pas de contenu, n’achète pas de publicité
et ne contacte pas les profils personnels. Il n’utilise pas l’API OpenAI payante.
Les publications en état incertain sont bloquées et signalées, sans nouvel essai.
La réception d’un jeton valide ne garantit pas que Meta autorisera chaque action :
un test réel n’est possible qu’avec un premier contenu autorisé par le propriétaire.

Les e-mails autorisés sont traités par le workflow GitHub pendant ses passages
planifiés. Le plafond est réglable de 1 à 10 réservations par jour dans l’interface, du lundi au vendredi
9 h–18 h Paris. Le bouton de pause bloque la recherche, les envois et le relais
social lors de leur prochain contrôle. Un mail ou post déjà transmis ne peut pas
être rappelé par ce bouton.

Les actions de recherche restent limitées à une réservation quotidienne ; une
recherche vide ne doit pas être présentée comme une liste de prospects obtenus.
Les messages privés Instagram/Messenger restent indisponibles. L’exclusion des
profils personnels évite de solliciter une liste d’amis ; aucune comparaison avec
la liste d’amis privée de l’utilisateur n’est effectuée ou revendiquée.
