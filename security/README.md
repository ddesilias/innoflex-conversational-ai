# Audit des dépendances du pilote

Date : 8 novembre 2026. Périmètre : branche de développement security/session-bound-chat-access, dépendances de production du fichier pnpm-lock.yaml. Ce rapport ne décrit pas le déploiement de main.

| Niveau | Avant | Après |
| --- | ---: | ---: |
| Critique | 13 | 0 |
| Élevé | 71 | 44 |
| Modéré | 90 | 72 |
| Faible | 14 | 9 |

Les chiffres sont les compteurs de pnpm audit, pas un nombre d’attaques ou de failles exploitables démontrées. Une mise à niveau peut changer l’arbre de dépendances et les alertes indirectes ; les niveaux ne diminuent pas tous nécessairement.

## Modifications

Next.js 15.5.28, Auth.js 5.0.0-beta.32 et ESLint Next aligné. Paramètres asynchrones des pages conversation/partage adaptés ; ancienne option experimental.runtime retirée. L’adaptateur Prisma d’Auth.js n’était importé nulle part dans le code et a été retiré des dépendances, sans opération sur les données.

Les versions transitives form-data 2.5.6/4.0.6 et seroval 1.6.8 sont imposées par des overrides ciblés dans la même version majeure. Ces contraintes doivent être réévaluées au prochain audit ; elles ne remplacent pas la modernisation de l’AI SDK et de l’intégration avatar.

## Validation et limites

43 tests unitaires/de sécurité, contrôle TypeScript et compilation Next.js réussis après mise à niveau. Les cinq tests Redis réels avaient déjà validé les scripts ; ces scripts n’ont pas changé dans cette mise à niveau. Des avertissements de lint et de peer dependencies restent présents. La connexion réelle, les sessions existantes, Stripe, l’avatar et les appels IA payants ne sont pas validés de bout en bout.

Les 44 alertes élevées et les autres alertes restantes nécessitent encore un examen. Ne pas déclarer ce produit prêt à commercialiser. Le déploiement de production n’a pas reçu cette migration ; seul le renommage y a été confirmé.

Le rapport JSON contient une empreinte de package.json et pnpm-lock.yaml. Le dashboard refuse d’utiliser ses compteurs si cette empreinte ne correspond plus aux fichiers locaux.

Sources : [avis Next.js](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [avis Auth.js](https://github.com/advisories/GHSA-8fpg-xm3f-6cx3), [migration Next.js 15](https://nextjs.org/docs/app/guides/upgrading/version-15).
