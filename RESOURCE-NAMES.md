# INNOFLEX Trading & Investissement — noms des ressources

| Élément | Nom actuel |
| --- | --- |
| Application | INNOFLEX Trading & Investissement |
| Dépôt GitHub | ddesilias/innoflex-trading-investissement |
| Dossier local | innoflex-trading-investissement |
| Projet Vercel | innoflex-trading-investissement |
| Domaine canonique | innoflex-trading-investissement.vercel.app |
| Base Redis du pilote | innoflex-trading-investissement-pilote |
| Ancienne base PostgreSQL | trade_mentor_ai — renommage et adaptation des connexions à finaliser |

Les identifiants de projet et de base sont conservés, ainsi que les données et
les clés de stockage historiques. Les anciens domaines et le dépôt précédent
restent compatibles par redirection. Le nom du projet Vercel ne constitue pas
une promotion de la branche de préproduction vers la production.

Le dashboard utilise le nouvel identifiant de dépôt. Les observations historiques
conservent leurs commits d’origine ; elles ne certifient pas les nouvelles
fonctionnalités. Les secrets ne sont pas inclus dans cette documentation.

## Stockages Neon de l’équipe — vérification du 9 novembre 2026

| Ancien nom affiché | Nom affiché actuel | Projet Vercel connecté |
| --- | --- | --- |
| neon-purple-marble | innoflex-investor-portal-postgres | innoflex-investor-portal |
| ai-sdk-rag-starter-postgres | innoflex-document-assistant-postgres | innoflex-document-assistant |
| sol | innoflex-sol-postgres | Aucun ; usage métier à identifier |

Les trois renommages d’affichage ont été confirmés dans Vercel. Les deux premiers
sont également visibles dans la liste des projets Neon. Les identifiants de
ressource, plans et réglages de connexion n’ont pas été modifiés.

Le projet Neon anciennement nommé `sol` contient la base `neondb` sur la branche
`main`. La consommation affichée pour la période courante est nulle ; cela ne
prouve pas l’absence de données ou d’autres consommateurs.

L’espace Neon accessible via l’intégration Vercel ne liste que ces trois projets.
L’ancienne base `trade_mentor_ai` n’y a pas été identifiée. Son renommage interne
reste en attente : la lecture ciblée des URL par l’API Vercel exige encore une
vérification de sécurité (`challenge_required`). Ne pas modifier les URL avant de
pouvoir vérifier toutes les destinations et coordonner le changement.
