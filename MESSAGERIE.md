# Messages privés et assistant IA

INNOFLEX Trading & Investissement sépare deux usages :

- L’assistant IA (`/`, `/chat/:id`) conserve les conversations IA existantes.
  Il n’accède pas automatiquement au journal ou à la messagerie et n’envoie
  pas de message à un autre utilisateur. Les appels IA restent soumis à
  l’activation et aux quotas ; aucun appel payant n’a été utilisé pour ce travail.
- Les messages privés (`/messages`) permettent un échange entre deux comptes
  connectés, sur invitation explicite. Ils ne sont pas transmis au modèle IA.

Une invitation est aléatoire sur 256 bits, valable 24 heures, utilisable une seule
fois. Seul son condensat est stocké. Elle donne accès à l’historique de la
conversation concernée ; le journal et les conversations IA ne sont pas partagés.
Le destinataire saisit le code dans l’application et accepte l’invitation. Aucun
annuaire d’adresses e-mail ni recherche de comptes n’est exposé.

Chaque lecture et chaque écriture vérifie l’identité et l’appartenance côté Redis.
Les clés distinguent local, préproduction et production. Une invitation ne permet
pas d’ajouter une troisième personne. Les messages sont du texte brut, sans
pièces jointes ; les adresses e-mail des comptes ne sont pas incluses dans le
contenu retourné. Ils ne sont pas chiffrés de bout en bout.

## Limites du pilote

10 conversations par compte, les 200 derniers messages conservés par conversation,
2 000 caractères par message et 10 envois par minute par compte. L’actualisation
est manuelle. Il n’y a pas de notification e-mail ni d’indicateur de présence.
Le code d’invitation est affiché à la création et n’est pas récupérable après
rechargement. Le blocage, l’archivage et la suppression des conversations restent
à construire avant une
ouverture commerciale de la messagerie. Un nouveau test humain à deux comptes
reste nécessaire ; les premiers contrôles utilisent Redis temporaire.

## Vérification

Les tests vérifient l’échange via les actions serveur avec trois sessions simulées,
la lecture d’une conversation vide, la protection des tiers, l’invitation à usage
unique et expirée, les limites d’envoi et la non-duplication d’un nouvel essai.
Aucun message n’a été envoyé à un utilisateur réel pendant ces contrôles.

## Remplacer ou révoquer une invitation

Le créateur d’une conversation sans second participant peut créer un nouveau
code depuis « Gérer l’invitation ». Il expire après 24 heures et invalide tous
les anciens codes, y compris ceux des conversations créées avant cette évolution.
Il peut également révoquer l’invitation sans supprimer les messages. Après
rechargement, un code perdu peut être remplacé ; il n’est jamais restitué par le
serveur. Les anciennes empreintes expirent naturellement et ne donnent plus accès.

Les commandes vérifient le créateur et l’absence d’invité atomiquement dans Redis.
Si une acceptation et une révocation arrivent ensemble, seule la première opération
valide réussit. Révoquer une invitation ne permet pas de retirer un participant
ayant déjà rejoint la conversation. Les nouveaux codes sont limités à dix par
minute et par créateur ; la révocation reste possible sans consommer ce quota.
Aucune invitation n’est envoyée par l’application.

Validation de cette étape : 103 tests applicatifs, 23 tests Redis isolés, TypeScript
et compilation Next.js réussis. Les cas couvrent la concurrence entre codes,
acceptation et révocation, les invitations historiques, l’interdiction des tiers
et la conservation de l’historique. Le parcours humain dans le navigateur reste
à valider ; aucun message réel, e-mail ni appel IA payant n’a été envoyé.
