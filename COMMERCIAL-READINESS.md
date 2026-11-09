# Préparation commerciale — assistant personnel INNOFLEX

Le pilote n’est pas encore prêt à être commercialisé. Les correctifs sont sur la branche `security/session-bound-chat-access` ; ils ne certifient pas la version de production.

| Parcours | État constaté | Validation restant à réaliser |
| --- | --- | --- |
| Création de compte et connexion | Stockage scrypt asynchrone, minimum 12 caractères pour les nouvelles inscriptions, fonctions de stockage réservées au serveur, création atomique, limites Redis avant les opérations coûteuses | Parcours réel en préproduction, protection réseau complémentaire, vérification d’adresse, envoi des liens et interface de récupération |
| Récupération de compte | Jetons temporaires, limites, révocation des sessions, formulaires et intégration SendGrid préparés ; configuration obligatoire avant activation | Expéditeur vérifié, clé serveur, validation de réception et du parcours de bout en bout |
| Comptes existants | Vérification SHA-256 historique, migration scrypt après connexion réussie avec comparaison atomique | Essai sur un compte de test ancien ; aucune réécriture massive des comptes |
| Conversation | Chat texte et consignes d’assistant personnel, démonstration boursière désactivée | Finir la migration RSC vers AI SDK UI, interruption, reprise et erreurs de streaming |
| Historique et données | Contrôles d’appartenance et conservation des historiques anciens | Parcours export/suppression, validation d’isolation avec deux utilisateurs réels |
| Consommation IA | Quotas serveur atomiques ; modèles configurés côté serveur | Parcours réel, mesures de coût et de latence, configuration distincte par environnement |
| Paiement | Intégration Stripe de test préparée, webhooks et rapprochement testés avec simulations | Configurer et valider Checkout, portail, résiliation et droits en mode test ; définir l’offre et les prix |
| Exploitation | Catalogue, liens et contrôles HTTP par environnement dans le dashboard local | Contrôles fonctionnels, erreurs corrélées à une version, alertes et procédure de support |

## Validation de cette étape

73 tests unitaires/comportementaux, 12 tests sur Redis isolé, TypeScript et compilation réussis. Les tests couvrent le nouveau stockage, les mots de passe incorrects, les comptes anciens, les courses de migration et les inscriptions concurrentes. Le manifeste des actions serveur généré ne référence plus `getUser` ou `createUser`.

Aucun compte réel migré, aucune donnée client modifiée, aucun paiement ni appel IA payant effectué. La protection de base contre les tentatives répétées est préparée. La récupération de compte et le parcours de conversation stable en préproduction restent prioritaires.

La migration scrypt utilise l’API officielle [Node.js crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), un sel aléatoire de 32 octets et des paramètres versionnés fixes. Les anciens identifiants et la casse des adresses ne sont pas modifiés. Les anciens mots de passe de 6 à 256 caractères restent acceptés ; les nouveaux doivent en compter 12 à 256. Une erreur de persistance bloque la connexion plutôt que de confirmer une migration non enregistrée.

## Limites de tentatives du pilote

Les connexions consomment au plus 10 essais par adresse sur 15 minutes, et 100 essais globaux par minute. Les inscriptions consomment au plus 3 essais par adresse sur une heure, et 20 essais globaux par minute. Tous les essais admis sont comptés, y compris ceux qui réussissent. Les compteurs des deux parcours sont distincts ; les clés utilisent une empreinte de l’adresse normalisée pour la limitation, sans modifier les identifiants existants.

Redis vérifie et incrémente les deux compteurs atomiquement, avant la lecture du compte et scrypt. Un refus ne prolonge pas la fenêtre. Une erreur Redis ou une réponse invalide bloque l’opération. Une saturation globale peut aussi refuser temporairement un utilisateur légitime : ces seuils initiaux doivent être adaptés aux mesures du pilote. Cette protection ne remplace pas une protection réseau ni un dispositif anti-abus complet ; la réponse d’inscription indique encore lorsqu’un compte existe. Aucun compteur d’attaque réel n’est annoncé dans le dashboard tant que sa collecte n’est pas raccordée.

## Fondations de récupération et révocation des sessions

Le module serveur de récupération génère un jeton aléatoire de 32 octets, ne stocke que son empreinte SHA-256 et un enregistrement lié à l’identité du compte, et applique une expiration Redis de 15 minutes. Le changement du mot de passe, la suppression du jeton utilisé et l’incrément de version des identifiants sont atomiques. Les autres jetons deviennent invalides après cet incrément. Le nouveau mot de passe doit être confirmé et respecter la politique de 12 à 256 caractères.

Les sessions JWT vérifient désormais cette version avec le compte à chaque consultation de session. Les comptes et sessions historiques sans version sont considérés en version 0. Une version différente, un compte supprimé ou une lecture impossible refuse la session. La migration SHA-256 vers scrypt ne change pas à elle seule cette version. Cette vérification ajoute une lecture Redis aux sessions authentifiées. Les requêtes déjà autorisées au moment d’un changement ne sont pas interrompues rétroactivement.

Les demandes de récupération sont limitées à 3 par identité par heure et 20 globalement par minute ; les confirmations à 5 par jeton par 15 minutes et 30 globalement par minute. Les modules de stockage sont réservés au serveur. Les actions publiques et les formulaires dépendent d’une configuration SendGrid complète, absente localement lors de la vérification. Les réponses uniformes, les liens sans paramètre de requête et la notification sont implémentés ; la livraison réelle reste à valider. Une reconnexion normale est requise, sans connexion automatique après réinitialisation.

Référence : [OWASP — récupération de mot de passe](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). Les tests couvrent les jetons aléatoires, les enregistrements sans jeton en clair, les expirations, l’usage concurrent, les liens étrangers et la révocation des sessions. Aucun compte réel ni mot de passe utilisateur n’a été modifié.

## Raccordement SendGrid

SendGrid a été choisi par l’utilisateur. Les écrans et les actions de récupération sont désormais préparés et protégés par une configuration serveur complète ; sans elle, ils affichent un état indisponible et n’accèdent ni aux comptes ni à l’envoi. Une demande valide reçoit sa réponse avant la recherche d’identité et l’envoi via `after`. Les erreurs de notification après un changement enregistré ne renvoient pas un faux échec de modification. Aucun secret ni expéditeur n’est présumé configuré. Voir [SENDGRID.md](SENDGRID.md) pour l’activation et les limites de livraison. L’envoi réel reste désactivé localement.

## Configuration SendGrid et isolation des comptes de test

La clé SendGrid est détectée localement et le mode sandbox a répondu HTTP 200, sans livraison d’e-mail. L’expéditeur déclaré est `dimitry.d@innoflexequipe.com`. La clé et un AUTH_SECRET distinct sont configurés pour la branche Preview. Les paramètres d’expéditeur, d’origine et de namespace sont préparés pour cette branche.

Les comptes et jetons de Local et Preview utilisent des préfixes séparés pour que les essais sur le Redis partagé ne puissent pas modifier les comptes de Production. Les comptes historiques de Production restent accessibles sous leurs anciennes clés. Il faut créer des comptes de test distincts, sans copie des comptes réels. La séparation des autres données de l’application reste à examiner.

L’isolation et le raccordement portent la validation à **73 tests et 12 tests Redis**, avec TypeScript et compilation réussis. La récupération locale est activée sur les comptes du namespace `local` avec l’expéditeur fourni par l’utilisateur. Le test SendGrid reste un test sandbox sans livraison. La réception et le changement de mot de passe de bout en bout sur un compte de test restent à effectuer avant toute ouverture commerciale.

## Nouveau Redis — validation locale réelle

Une nouvelle base Upstash `innoflex-conversational-ai-pilot` a été créée sur le plan Free en us-east-1, avec TLS, persistance et éviction désactivée. Les anciennes configurations sont sauvegardées localement dans `.local-backups/`, exclu de Git et réservé à l’utilisateur. `.env.local` pointe sur la nouvelle base ; le fichier `.env` historique n’est pas la référence active pour ces deux paramètres.

Le PING authentifié a répondu PONG. Un contrôle sur un compte jetable dans le namespace `local` a validé création, connexion, changement de mot de passe, refus de réutiliser le jeton, rejet de l’ancienne session et connexion avec le nouveau mot de passe. Ce compte et son jeton ont été supprimés après le test. Aucun e-mail réel n’a été envoyé et aucune ancienne donnée n’a été restaurée.

Les variables Redis spécifiques à la branche Preview ont été préparées pour cette nouvelle base, avec le namespace `preprod`. La réception du lien SendGrid et le parcours utilisateur complet restent à valider. La configuration historique de Production n’a pas été modifiée.
