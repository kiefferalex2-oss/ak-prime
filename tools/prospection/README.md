# AK PRIME : fonctionnement réel

Le workflow GitHub `prospection.yml` programme un passage environ toutes les 15 minutes. GitHub peut retarder un passage. Il ne s'agit pas d'un processus permanent.

## Email professionnel autonome

Avec `enabled`, `sending_enabled` et `autonomous_email_enabled` activés, le runner :

1. Lit les en-têtes des réponses OVH sans marquer les mails lus. Une réponse ou opposition arrête le contact.
2. Vérifie les sources publiques, les citations et les coordonnées proposées.
3. Retient uniquement les clubs de pratique sportive et les employeurs/CSE ; exclut les prestataires concurrents. Les sources et coordonnées doivent provenir du même site officiel.
4. Prépare une proposition factuelle dans un modèle borné, adapté au club ou aux salariés. Aucun prix, résultat, réduction ni disponibilité n'est inventé.
5. Autorise la version exacte sous une politique distincte de l'approbation personnelle du propriétaire. `approved` reste faux ; l'autorisation est enregistrée dans `autonomous_authorized_at` et `autonomous_snapshot`.
6. Réserve atomiquement un premier envoi puis l'adresse une seule fois via OVH. En cas d'incertitude, classe `uncertain` et ne retente pas. Aucun suivi automatique après silence.

Les envois ont lieu du lundi au vendredi entre 9 h et 18 h, heure de Paris, dans le plafond quotidien enregistré (10 actuellement). Le bouton « Tout mettre en pause » bloque les prochaines réservations. Un envoi déjà transmis au SMTP ne peut pas être rappelé.

Les modifications d'un message ou d'une source annulent l'autorisation. Désactiver le mode autonome bloque ses messages en attente ; les messages approuvés individuellement restent soumis au bouton général d'envoi.

## Particuliers et réseaux sociaux

La recherche peut conserver une demande publique récente et explicite d'un particulier adulte, hors profils sociaux, mineurs et données de santé. Elle ne collecte pas son adresse privée et n'en déduit jamais un consentement commercial. Ces pistes ne sont pas envoyées automatiquement par email.

Les publications sur la page Facebook AK PRIME et le compte Instagram akprime.fr sont traitées séparément : uniquement vos visuels et le texte exact approuvé, selon l'automatisation existante. Aucune publicité payante, aucun message privé ni publication dans les groupes Facebook n'est implémenté.

## Budget et preuves

Les passages gratuits de vérification et de mail continuent entre les recherches IA. Les recherches utilisent le plafond existant de 10 dollars par mois, avec une réservation prudente de 0,10 dollar par lot et un espacement minimum d'une heure. Le budget journalier étale cette enveloppe sur le mois : typiquement trois lots quotidiens au plafond actuel. Une réservation n'est pas une facture réelle du fournisseur.

Le tableau de bord `/prospection/` affiche les passages, les contacts, les autorisations et les envois réellement confirmés. « Mails envoyés » compte exclusivement les lignes ayant `sent_at`, jamais les contacts exclus. Une acceptation SMTP est une preuve de soumission, pas une preuve de lecture, de délivrabilité ni de vente.

Tests : `python3 -m unittest discover -s tests/prospection -q`.
