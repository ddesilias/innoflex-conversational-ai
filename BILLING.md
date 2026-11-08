# Stripe — préparation en mode test

Compte cible confirmé par interface : INNOFLEX EQUIPE, acct_1PvL4SKQ6tQikNSX. L’identité du compte API doit encore être vérifiée à la connexion.

## Implémenté

- SDK officiel Stripe et dépendance verrouillée.
- Construction serveur de Checkout : tarif récurrent de test vérifié, client issu du mapping serveur, identité de session, clé d’idempotence par tentative.
- Configuration refusant les clés de production ; origine de retour fixée côté serveur.
- Réception d’événements avec signature officielle sur le corps brut, refus des événements live/Connect, réponse 503 si la réconciliation échoue.
- Treize tests locaux et contrôle TypeScript réussis. Aucun appel API Stripe réel dans les tests.

Ces modules ne sont pas encore reliés à des routes HTTP ni à des boutons de paiement. Aucun droit payant n’est accordé par le retour Checkout. Le contrôle subscriptionExists dépendra d’un état serveur fiable ; il ne garantit pas à lui seul l’absence de souscriptions concurrentes.

## Configuration attendue côté serveur

STRIPE_SECRET_KEY (mode test), STRIPE_TEST_PRICE_ID (tarif récurrent de test), BILLING_APP_ORIGIN et un secret de webhook. Ne pas placer de valeurs secrètes dans ce document ou dans Git. Aucun tarif commercial n’est validé.

## Étapes restantes

1. Vérifier le compte API et son environnement de test.
2. Créer un mapping utilisateur/client Stripe unique et gérer les tentatives Checkout concurrentes.
3. Implémenter le stockage atomique des événements traités et la réconciliation des abonnements depuis Stripe, y compris les événements reçus dans le désordre.
4. Appliquer les droits côté serveur et traiter expiration, annulation, échec et reprise de paiement.
5. Brancher Checkout, le portail client et le webhook dans des routes authentifiées/configurées, puis valider les parcours en préproduction.
6. Relier erreurs, retards de synchronisation et statuts d’abonnement au dashboard.

Sources : https://docs.stripe.com/billing/subscriptions/webhooks ; https://docs.stripe.com/events/manage-webhook-endpoints ; https://docs.stripe.com/testing

## Synchronisation préparée

Le module reconcile.ts relit l’abonnement Stripe après acquisition d’un verrou par client. Il vérifie la liaison utilisateur/client/abonnement enregistrée côté serveur et le tarif autorisé ; les métadonnées reçues seules ne donnent aucun droit. Les événements dupliqués sont ignorés après leur traitement réussi. Les erreurs restent réessayables.

L’adaptateur Redis store.ts enregistre atomiquement le snapshot et l’identifiant d’événement, sous contrôle du jeton de verrou. Un traitement dont le verrou a expiré ne peut plus écrire. Les événements traités sont conservés 30 jours ; un événement plus ancien retraité relit toujours l’état Stripe courant. Le stockage utilise des clés distinctes billing:test:… . L’adaptateur doit être validé contre le Redis de préproduction, notamment sa compatibilité avec les scripts multi-clés.

Les droits préparés exigent un abonnement actif, sans pause de collecte, sur le tarif prévu, avec une période valide. Les essais gratuits ne sont pas assimilés à des abonnements payants. Un snapshot de plus de 15 minutes échoue sans accorder de droit : le rafraîchissement périodique ou à la demande doit donc être branché avant activation. Cette valeur est une politique technique de préproduction, pas un engagement commercial validé.

Validation : 20 tests et TypeScript réussis. Les tests de synchronisation utilisent Stripe et le stockage simulés ; ils ne certifient pas l’API réelle ou les scripts Redis. Les routes, le mapping initial, le rafraîchissement et le branchement des droits dans l’application restent à réaliser. Aucun paiement activé.

## Routes de préproduction ajoutées

- POST /api/billing/webhook : signature Stripe obligatoire, vérification du compte API courant puis réconciliation. Les événements live et Connect sont refusés.
- GET /api/billing/status : session obligatoire, lecture limitée à son utilisateur, réponse privée non mise en cache. Aucun droit payant si le miroir est périmé.

Activation volontaire via BILLING_TEST_ENABLED=true, STRIPE_SECRET_KEY en mode test, STRIPE_TEST_PRICE_ID, BILLING_APP_ORIGIN et STRIPE_WEBHOOK_SECRET. Sans ces paramètres, réponse 503. Le compte API doit être acct_1PvL4SKQ6tQikNSX ; aucun compte n’est supposé validé tant que cet appel réel n’a pas réussi.

La liaison initiale utilisateur/client/abonnement et le rafraîchissement des droits restent à brancher ; Checkout n’est toujours pas exposé aux utilisateurs. Un webhook sans liaison initiale retourne une erreur réessayable, sans accorder de droit. Les versions précédentes de ce document décrivent les étapes successives ; cette section actualise l’état des routes.

Validation locale : 25 tests et TypeScript réussis. Pas de test API Stripe ou Redis réel et pas de déploiement déclarés à cette étape.

Compilation Next.js réussie avec les routes status et webhook présentes. Avertissements existants de lint/configuration ; appels CoinGecko en échec DNS pendant la génération, sans échec de compilation. Les cinq paramètres de facturation listés ci-dessus sont absents des fichiers locaux examinés : aucune intégration réelle n’est validée.

## Démarrage Checkout branché

POST /api/billing/checkout exige une session et une origine identique à BILLING_APP_ORIGIN. Le corps de la requête ne choisit ni utilisateur, ni client, ni tarif, ni URL. Le compte API est contrôlé avant les appels de création.

Le client Stripe est lié à l’utilisateur dans les deux sens. Une intention de création persistante fournit une clé d’idempotence stable ; après 23 heures, une création incertaine exige une réconciliation au lieu de risquer un doublon. Les intentions Checkout suivent le même principe. Un abonnement en cours, y compris incomplet ou impayé, empêche un nouveau Checkout. Une intention expirée ou un changement de tarif demande encore un traitement explicite : le renouvellement automatique des tentatives n’est pas implémenté.

La première liaison à un abonnement est vérifiée contre le client enregistré, le tarif autorisé et les métadonnées relues chez Stripe. La liaison à cet abonnement et le snapshot sont enregistrés atomiquement. Le remplacement d’un ancien abonnement par un nouveau reste volontairement bloqué tant que son cycle de vie n’est pas implémenté.

Validation : 31 tests et TypeScript réussis. Le parcours est encore simulé. Restent : paramètres de test, validation Redis réelle, page de facturation, portail client, renouvellement sûr des tentatives, rafraîchissement des droits et application effective des quotas/droits dans les fonctions IA. Aucun tarif ni paiement réel créé.

## Page de facturation et portail client

La page /billing exige une connexion et est accessible depuis le menu utilisateur « Facturation · mode test ». Elle affiche un statut inconnu/indisponible lorsque la configuration manque, et ne confirme pas l’abonnement à partir des paramètres d’URL du retour Checkout. Les redirections navigateur acceptent uniquement les hôtes HTTPS exacts checkout.stripe.com et billing.stripe.com.

POST /api/billing/portal exige une session et une origine conforme, vérifie le compte Stripe et relit le client associé côté serveur. Un client supprimé, en mode live ou associé à un autre utilisateur est refusé. Le portail Stripe doit encore être configuré dans l’environnement de test ; aucune option de portail ni tarification réelle n’a été activée.

35 tests passent, TypeScript et lint des composants modifiés passent. Revue React : composant serveur pour l’accès, SDK Stripe hors du bundle client, nettoyage de la requête au démontage, boutons natifs avec états désactivés et message de statut accessible. Les interactions navigateur avec Stripe restent à valider sur une préproduction configurée.

Compilation Next.js réussie avec /billing et les routes checkout, portal, status et webhook. Les avertissements préexistants et l’échec DNS CoinGecko restent visibles pendant la génération ; aucune certification de santé globale n’est déclarée.

## Rafraîchissement des droits et quotas pilote

La consultation du statut relit l’abonnement côté Stripe lorsque le snapshot a au moins dix minutes. Le chemin utilise le même verrou et la même écriture atomique que les webhooks, vérifie la liaison de l’utilisateur et n’invente pas de premier abonnement si son webhook manque. Après quinze minutes, un miroir non rafraîchi ne donne aucun droit. Ce mécanisme est à la demande ; aucun ordonnanceur de fond n’est installé et les fonctionnalités IA n’ont pas encore de différenciation commerciale par offre.

Les appels du chat principal et du chat avatar partagent un compteur journalier par utilisateur. Les jetons avatar ont un compteur séparé. Les limites AI_DAILY_REQUEST_LIMIT et AVATAR_DAILY_TOKEN_LIMIT sont obligatoires, entières et comprises entre 1 et 10000 ; aucun volume commercial n’est présumé. Si la configuration ou Redis manque, aucun appel fournisseur n’est autorisé. Un dépassement HTTP renvoie 429 avec Retry-After. Le jour UTC et l’expiration viennent de l’horloge Redis.

Une tentative réservée reste comptée si le fournisseur échoue : ce compteur limite les requêtes, pas les factures ou les tokens réellement consommés. Il ne constitue pas un budget financier ni une protection contre des comptes multiples. Les réponses chat sont limitées à 1024 tokens. Les messages avatar ont des limites de taille et de rôles ; la validation complète de tous les parcours reste à poursuivre.

Validation : 43 tests locaux passent, plus 5 tests d’intégration sur Redis 7 réel dans un conteneur Docker sans ports/volumes, supprimé après exécution. Ces tests couvrent quotas concurrents, changement de jour, concurrence sur la propriété des chats, conflit de liaison client et écriture protégée par le jeton de verrou. Ils ne remplacent pas la validation du Redis managé de préproduction et de ses règles multi-clés. TypeScript passe. Commande reproductible : npm run test:redis (Docker nécessaire).

Compilation Next.js réussie après ajout des quotas et du rafraîchissement. Les avertissements existants et les erreurs réseau CoinGecko restent à traiter séparément.
