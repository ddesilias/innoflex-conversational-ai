# Préparation commerciale — assistant personnel INNOFLEX

Le pilote n’est pas encore prêt à être commercialisé. Les correctifs sont sur la branche `security/session-bound-chat-access` ; ils ne certifient pas la version de production.

| Parcours | État constaté | Validation restant à réaliser |
| --- | --- | --- |
| Création de compte et connexion | Stockage scrypt asynchrone, minimum 12 caractères pour les nouvelles inscriptions, fonctions de stockage réservées au serveur, création atomique, limites Redis avant les opérations coûteuses | Parcours réel en préproduction, protection réseau complémentaire, vérification d’adresse et récupération de compte |
| Comptes existants | Vérification SHA-256 historique, migration scrypt après connexion réussie avec comparaison atomique | Essai sur un compte de test ancien ; aucune réécriture massive des comptes |
| Conversation | Chat texte et consignes d’assistant personnel, démonstration boursière désactivée | Finir la migration RSC vers AI SDK UI, interruption, reprise et erreurs de streaming |
| Historique et données | Contrôles d’appartenance et conservation des historiques anciens | Parcours export/suppression, validation d’isolation avec deux utilisateurs réels |
| Consommation IA | Quotas serveur atomiques ; modèles configurés côté serveur | Parcours réel, mesures de coût et de latence, configuration distincte par environnement |
| Paiement | Intégration Stripe de test préparée, webhooks et rapprochement testés avec simulations | Configurer et valider Checkout, portail, résiliation et droits en mode test ; définir l’offre et les prix |
| Exploitation | Catalogue, liens et contrôles HTTP par environnement dans le dashboard local | Contrôles fonctionnels, erreurs corrélées à une version, alertes et procédure de support |

## Validation de cette étape

59 tests unitaires/comportementaux, 9 tests sur Redis isolé, TypeScript et compilation réussis. Les tests couvrent le nouveau stockage, les mots de passe incorrects, les comptes anciens, les courses de migration et les inscriptions concurrentes. Le manifeste des actions serveur généré ne référence plus `getUser` ou `createUser`.

Aucun compte réel migré, aucune donnée client modifiée, aucun paiement ni appel IA payant effectué. La protection de base contre les tentatives répétées est préparée. La récupération de compte et le parcours de conversation stable en préproduction restent prioritaires.

La migration scrypt utilise l’API officielle [Node.js crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), un sel aléatoire de 32 octets et des paramètres versionnés fixes. Les anciens identifiants et la casse des adresses ne sont pas modifiés. Les anciens mots de passe de 6 à 256 caractères restent acceptés ; les nouveaux doivent en compter 12 à 256. Une erreur de persistance bloque la connexion plutôt que de confirmer une migration non enregistrée.

## Limites de tentatives du pilote

Les connexions consomment au plus 10 essais par adresse sur 15 minutes, et 100 essais globaux par minute. Les inscriptions consomment au plus 3 essais par adresse sur une heure, et 20 essais globaux par minute. Tous les essais admis sont comptés, y compris ceux qui réussissent. Les compteurs des deux parcours sont distincts ; les clés utilisent une empreinte de l’adresse normalisée pour la limitation, sans modifier les identifiants existants.

Redis vérifie et incrémente les deux compteurs atomiquement, avant la lecture du compte et scrypt. Un refus ne prolonge pas la fenêtre. Une erreur Redis ou une réponse invalide bloque l’opération. Une saturation globale peut aussi refuser temporairement un utilisateur légitime : ces seuils initiaux doivent être adaptés aux mesures du pilote. Cette protection ne remplace pas une protection réseau ni un dispositif anti-abus complet ; la réponse d’inscription indique encore lorsqu’un compte existe. Aucun compteur d’attaque réel n’est annoncé dans le dashboard tant que sa collecte n’est pas raccordée.
