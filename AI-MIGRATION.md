# Migration IA du pilote

La branche de travail utilise désormais AI SDK 7 et Zod 4, avec un pont temporaire vers @ai-sdk/rsc. Les API de schémas, limites de sortie et réponses streamées ont été adaptées à la version installée. Les données historiques ne sont pas réécrites.

## Configuration avant test réel

OPENAI_API_KEY doit rester côté serveur. Configurer OPENAI_CHAT_MODEL et, pour la transcription, OPENAI_TRANSCRIPTION_MODEL avec des identifiants disponibles pour le compte fournisseur. Aucun identifiant de modèle n’est présumé valide par défaut. Les limites AI_DAILY_REQUEST_LIMIT et AVATAR_DAILY_TOKEN_LIMIT restent obligatoires. Les variables de test Stripe sont décrites dans BILLING.md.

## Étape suivante

Migrer les interactions RSC vers une route de chat et AI SDK UI : annulation du streaming, historique serveur faisant autorité, états d’erreur lisibles et reprise d’une conversation. Garder les écrans de marché/avatar comme fonctionnalités héritées à examiner ; ils ne définissent pas à eux seuls le service commercial. Valider connexion, conversation, historique, isolation, quotas puis paiement de test en préproduction avant promotion vers main.

Références : documentation embarquée dans node_modules/ai/docs et node_modules/@ai-sdk/rsc ; https://ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

## Orientation du pilote

Le lancement vise un assistant personnel généraliste : rédaction, explications, organisation et préparation de décisions. Le chat texte est l’entrée principale. Les deux entrées serveur partagent les mêmes consignes et aucun outil boursier n’est proposé au modèle. Les anciens historiques restent lisibles ; les anciennes cartes d’achat indiquent explicitement que la démonstration est désactivée et ne modifient plus l’historique. Aucun accès au calendrier, rappel ou action externe n’est annoncé.
