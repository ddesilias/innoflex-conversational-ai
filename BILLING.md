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
