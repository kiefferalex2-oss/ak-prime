# Supabase — AK PRIME

Ce dossier contient la future base sécurisée du back-office AK PRIME.

## Ce que couvre la migration initiale

- profils utilisateurs et rôles `owner / coach / client`
- un dossier client unique conservé dans le temps
- historique des offres / engagements
- onboarding
- réponses aux questionnaires
- notes de visio liées au dossier
- préférences / tolérances
- tests et retests
- cycles
- check-ins hebdomadaires
- événements du Passeport
- notes privées coach
- rendez-vous
- règles RLS pour séparer l'espace coach et l'espace client

## Sécurité

La migration active Row Level Security sur toutes les tables contenant des données client.

Un nouvel utilisateur Auth est créé en rôle `client` par défaut. Le rôle `owner` ou `coach` ne doit jamais pouvoir être choisi depuis le navigateur.

Le site GitHub Pages actuel reste un prototype. Ne pas y utiliser de vraies données client tant que :
1. le projet Supabase n'est pas créé,
2. cette migration n'est pas appliquée,
3. l'authentification n'est pas branchée,
4. les tests d'accès coach/client n'ont pas été validés.

## Étape suivante

Créer le projet Supabase AK PRIME, appliquer `migrations/001_initial_schema.sql`, créer le premier compte owner, puis connecter l'interface web à Supabase.
