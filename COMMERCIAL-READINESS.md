# Préparation commerciale — assistant personnel INNOFLEX

Le pilote n’est pas encore prêt à être commercialisé. Les correctifs sont sur la branche `security/session-bound-chat-access` ; ils ne certifient pas la version de production.

| Parcours | État constaté | Validation restant à réaliser |
| --- | --- | --- |
| Création de compte et connexion | Stockage scrypt asynchrone, minimum 12 caractères pour les nouvelles inscriptions, fonctions de stockage réservées au serveur, création atomique | Parcours réel en préproduction, protection contre les tentatives répétées, vérification d’adresse et récupération de compte |
| Comptes existants | Vérification SHA-256 historique, migration scrypt après connexion réussie avec comparaison atomique | Essai sur un compte de test ancien ; aucune réécriture massive des comptes |
| Conversation | Chat texte et consignes d’assistant personnel, démonstration boursière désactivée | Finir la migration RSC vers AI SDK UI, interruption, reprise et erreurs de streaming |
| Historique et données | Contrôles d’appartenance et conservation des historiques anciens | Parcours export/suppression, validation d’isolation avec deux utilisateurs réels |
| Consommation IA | Quotas serveur atomiques ; modèles configurés côté serveur | Parcours réel, mesures de coût et de latence, configuration distincte par environnement |
| Paiement | Intégration Stripe de test préparée, webhooks et rapprochement testés avec simulations | Configurer et valider Checkout, portail, résiliation et droits en mode test ; définir l’offre et les prix |
| Exploitation | Catalogue et liens d’environnements dans le dashboard | Santé applicative mesurée, erreurs corrélées à une version, alertes et procédure de support |

## Validation de cette étape

56 tests unitaires/comportementaux, 7 tests sur Redis isolé, TypeScript et compilation réussis. Les tests couvrent le nouveau stockage, les mots de passe incorrects, les comptes anciens, les courses de migration et les inscriptions concurrentes. Le manifeste des actions serveur généré ne référence plus `getUser` ou `createUser`.

Aucun compte réel migré, aucune donnée client modifiée, aucun paiement ni appel IA payant effectué. La prochaine étape prioritaire est la protection des accès et la récupération de compte, suivie du parcours de conversation stable en préproduction.

La migration scrypt utilise l’API officielle [Node.js crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), un sel aléatoire de 32 octets et des paramètres versionnés fixes. Les anciens identifiants et la casse des adresses ne sont pas modifiés. Les anciens mots de passe de 6 à 256 caractères restent acceptés ; les nouveaux doivent en compter 12 à 256. Une erreur de persistance bloque la connexion plutôt que de confirmer une migration non enregistrée.
