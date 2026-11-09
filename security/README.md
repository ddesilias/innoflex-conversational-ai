# Audit des dépendances du pilote

État du 8 novembre 2026, branche `security/session-bound-chat-access`. Périmètre : dépendances de production du fichier pnpm-lock.yaml. Ce rapport ne certifie pas le déploiement de main.

| Niveau | Audit initial | État actuel |
| --- | ---: | ---: |
| Critique | 13 | 0 |
| Élevé | 71 | 0 |
| Modéré | 90 | 32 |
| Faible | 14 | 4 |

Ces chiffres sont les compteurs de pnpm audit, pas un nombre d’attaques ou de failles exploitables démontrées. Les alertes restantes nécessitent encore une revue.

## Correctifs préparés

- Next.js 15.5.28 et Auth.js 5.0.0-beta.32 ; paramètres de pages asynchrones adaptés et ancien adaptateur Auth/Prisma inutilisé retiré.
- AI SDK 7.0.165, @ai-sdk/rsc 3.0.165, fournisseur OpenAI 4.0.111 et Zod 4.6.7. L’ancien SDK IA et les peers Vue/Solid ne sont plus utilisés. jsondiffpatch est désormais en version corrigée 0.7.6.
- Bibliothèques HTTP, identifiants et polices mises à jour ; overrides transitifs compatibles conservés dans package.json lorsqu’ils restent nécessaires.
- Historiques v3 conservés sans réécriture : conversion et validation des messages/outils à la frontière fournisseur. Le texte streamé est accumulé et finalisé.
- Transcription déplacée côté serveur : session, quota, taille maximale 2 Mio, réponse privée, aucun contenu journalisé. Le navigateur ne référence plus NEXT_PUBLIC_OPENAI_API_KEY ni dangerouslyAllowBrowser.

Les modèles sont configurés côté serveur via OPENAI_CHAT_MODEL et OPENAI_TRANSCRIPTION_MODEL, avec OPENAI_API_KEY. Aucun modèle n’est choisi par défaut sans vérification de sa disponibilité pour le compte.

## Validation et limites

50 tests, contrôle TypeScript et compilation réussis. Le streaming utilise le fournisseur simulé officiel dans les tests ; les tests audio vérifient autorisation, taille et quota sans appel payant. Les cinq tests Redis locaux avaient validé les scripts atomiques, inchangés dans cette migration.

Les appels IA et Stripe réels, les sessions existantes et l’avatar restent à valider en préproduction configurée. RSC est conservé temporairement mais reste expérimental ; le passage à AI SDK UI fait partie des critères internes avant lancement stable. Les 32 alertes modérées et 4 faibles restent ouvertes. Aucun paiement réel ni appel IA payant n’a été déclenché pour cette vérification.

La présence passée d’une clé publique réelle et l’état des anciens déploiements ne sont pas confirmés ; aucune rotation de clé n’a été effectuée. La production n’a pas reçu ces changements.

Le rapport JSON contient une empreinte de package.json et pnpm-lock.yaml. Le dashboard invalide les compteurs si elle ne correspond plus aux fichiers locaux.

Sources : [avis Next.js](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [avis Auth.js](https://github.com/advisories/GHSA-8fpg-xm3f-6cx3), [avis jsondiffpatch](https://github.com/advisories/GHSA-j4fx-xxwh-2485), [avis Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [migration RSC vers UI](https://ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui).

## Comptes utilisateurs

Le stockage des nouveaux mots de passe utilise désormais scrypt asynchrone (N=131072, r=8, p=1), un sel aléatoire et une comparaison en temps constant. Les comptes SHA-256 existants migrent lors d’une connexion correcte ; un script Redis compare l’identité et l’ancienne empreinte avant toute mise à jour. La création est atomique. Les fonctions de lecture/création du stockage ne sont plus des actions serveur publiques ; la session reçoit uniquement l’identifiant et l’adresse du compte. Les nouvelles inscriptions exigent 12 à 256 caractères.

Cette étape porte la validation à 56 tests et 7 tests Redis isolés, avec TypeScript et compilation réussis. Le contrôle des tentatives répétées, la récupération de compte et les parcours réels restent à traiter. Voir [la préparation commerciale](../COMMERCIAL-READINESS.md). Aucun compte réel n’a été migré pendant ces tests.

## Limitation des tentatives d’accès

La création et l’authentification des comptes vérifient désormais des compteurs Redis atomiques par adresse et globaux avant la lecture du compte ou scrypt. Les parcours connexion et inscription ont leurs propres limites et expirations. Une indisponibilité de la protection bloque l’opération ; un refus ne prolonge pas le blocage. Les seuils initiaux et les limites restantes sont documentés dans [la préparation commerciale](../COMMERCIAL-READINESS.md). Les validations passent à 59 tests et 9 tests Redis isolés. Aucun essai sur un compte réel n’a été déclenché.
