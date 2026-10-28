# AK PRIME — e-mails d'authentification aux couleurs de la marque

## Fichiers prêts
- Invitation / activation du compte : `supabase/templates/invite.html`
- Réinitialisation du mot de passe : `supabase/templates/recovery.html`
- Confirmation d'adresse e-mail : `supabase/templates/confirmation.html`

Les trois HTML reprennent le style des notifications AK PRIME de la migration `033_akprime_email_site_visual_v3.sql` : en-tête bleu nuit, cartouche AK/PRIME, doré, bleu, typographie et pied de page. Ils sont compatibles avec les modèles de Supabase Auth. Ils utilisent **exactement** `{{ .ConfirmationURL }}` pour préserver les liens sécurisés. L'invitation peut aussi utiliser `{{ .Data.full_name }}` et affiche une mention de simulation uniquement pour les comptes `akprime_test:true`.

## Activation — projet Supabase hébergé
1. Ouvrir https://supabase.com/dashboard/project/gptvgldboqarfklorjip/auth/templates (ou Authentication → Email Templates).
2. Dans **Invite user** / **Inviter un utilisateur** : objet **AK PRIME — Activez votre espace personnel**. Copier tout le contenu de `supabase/templates/invite.html` dans l'éditeur HTML, sauvegarder.
3. Dans **Reset password** : objet **AK PRIME — Réinitialisez votre mot de passe**. Copier `supabase/templates/recovery.html`.
4. Dans **Confirm sign up** : objet **AK PRIME — Confirmez votre adresse e-mail**. Copier `supabase/templates/confirmation.html`.
5. Vérifier dans **Authentication → URL Configuration** que `https://akprime.fr/reinitialiser-mot-de-passe.html` est dans les URL de redirection autorisées, sans supprimer les autres redirections nécessaires.
6. Envoyer **une nouvelle** invitation de test avec une autre adresse e-mail (les invitations déjà reçues ne peuvent pas être réécrites).
7. Tester le bouton d'invitation, la page de définition de mot de passe et la connexion réelle.

## De « Supabase » à « AK PRIME » dans le champ expéditeur
L'e-mail HTML personnalisé ne change pas à lui seul l'adresse expéditrice. Pour envoyer sous `AK PRIME <contact@akprime.fr>`, activer un SMTP dédié dans **Authentication → SMTP Settings**. Les notifications AK PRIME utilisent déjà Resend côté serveur ; on peut utiliser Resend aussi pour Supabase Auth, après vérification que `akprime.fr` est bien configuré dans Resend.

Paramètres SMTP Resend :
- Host : `smtp.resend.com`
- Port : `465` (SSL) ou `587` (STARTTLS) suivant les paramètres disponibles
- Username : `resend`
- Password : **clé API Resend secrète**, à coller directement dans Supabase (jamais dans le dépôt GitHub, dans le front, dans les captures ou dans un chat)
- Sender name : `AK PRIME`
- Sender address : `contact@akprime.fr`

**Important pour les projets Free créés depuis le 3 juin 2026 :** Supabase peut bloquer la modification des modèles tant que son SMTP par défaut est utilisé. Activer un SMTP personnalisé (comme Resend) rend de nouveau la personnalisation possible sans nécessairement passer au plan payant. Il faut vérifier les paramètres de facturation/quotas du fournisseur e-mail.

## Sécurité
- Garder `{{ .ConfirmationURL }}` tel quel. Ne jamais remplacer par un lien fixe ni transmettre un jeton d'activation dans une autre page.
- Le message TEST doit rester clairement signalé si `akprime_test:true`.
- L'e-mail n'est jamais la preuve d'un paiement : l'ouverture des accès se fonde sur le webhook Stripe TEST signé.
- Ne pas envoyer de données sensibles du questionnaire dans l'e-mail.
- L'envoi Supabase Auth et l'envoi de notifications sont deux circuits distincts ; modifier `private.notification_mail_html` ne modifie pas les modèles Supabase.

Documentation :
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier
- https://resend.com/changelog/smtp-service

**État :** les trois modèles HTML sont versionnés et prêts à copier. Cette connexion n'expose pas d'action de modification des paramètres d'e-mail Auth hébergés ; aucune modification du tableau de bord Supabase/Auth SMTP n'a encore été effectuée.
