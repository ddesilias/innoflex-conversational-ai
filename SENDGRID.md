# Récupération de compte — SendGrid

Le code SendGrid et les formulaires sont préparés sur la branche de travail. Aucun envoi réel n’a été effectué pendant les vérifications. La clé locale a été détectée et une validation API sandbox a répondu HTTP 200, sans livraison. L’expéditeur déclaré par l’utilisateur est `dimitry.d@innoflexequipe.com`. La configuration Preview est limitée à la branche de travail et utilise un secret de session distinct. La réception réelle n’est pas encore validée.

## Configuration par environnement

- `SENDGRID_API_KEY` : clé privée ayant uniquement la permission Mail Send, stockée comme secret serveur. Jamais de préfixe NEXT_PUBLIC ni de clé dans Git ou dans une conversation.
- `SENDGRID_FROM_EMAIL` : adresse d’expédition authentifiée/vérifiée dans SendGrid. La présence de la variable ne certifie pas cette vérification.
- `PASSWORD_RESET_ORIGIN` : origine exacte de l’application qui doit recevoir le lien, sans chemin, fragment, identifiants ou paramètres. HTTPS obligatoire, sauf localhost en développement. Ne dépend jamais d’un en-tête Host envoyé par un client.
- `PASSWORD_RESET_ENABLED` : `false` par défaut. Activer avec `true` seulement lorsque l’expéditeur et les secrets de l’environnement sont prêts à être testés.

En local, utiliser `.env.local` à partir de `.env.example` et redémarrer le serveur. Dans Vercel, configurer séparément Development et Preview ; une modification exige un nouveau déploiement. Garder Production désactivée jusqu’à validation du parcours en préproduction. L’origine du lien et le stockage Redis doivent appartenir au même environnement ; ne pas tester une réinitialisation sur les comptes réels de production.

## Parcours et garanties

`/forgot-password` demande l’adresse e-mail ; `/reset-password` reçoit le jeton dans le fragment `#token=…`. Ce fragment n’est pas transmis dans la requête HTTP initiale. Le navigateur le retire de la barre d’adresse après lecture ; le formulaire le soumet ensuite au serveur dans le corps de l’action. Aucun jeton ne doit être copié dans les journaux, une capture ou un outil d’analyse. Les pages demandent aux robots de ne pas les indexer et utilisent une politique de référent `no-referrer`.

Une demande valide reçoit une réponse publique identique, avant toute recherche d’identité, pour les comptes existants et inconnus. Le traitement de fond utilise `after` de Next.js, applique les limites Redis, prépare le jeton et appelle l’API officielle SendGrid. Il n’effectue aucun envoi lorsqu’aucun compte ne correspond. Les erreurs ne journalisent qu’un code fixe, sans adresse, clé ni jeton. Les suivis de clics, d’ouverture et d’abonnement sont désactivés sur ces messages.

Après changement atomique du mot de passe, la réponse confirme la modification et demande une connexion normale ; une notification sans mot de passe ni jeton est programmée. L’échec de cette notification ne transforme pas une modification déjà enregistrée en échec apparent. Les anciennes sessions et les autres liens sont invalidés par la version des identifiants.

## Limites à vérifier avant activation

Le HTTP 202 de SendGrid confirme l’acceptation de la requête, pas la livraison en boîte de réception. `after` poursuit le travail après la réponse dans la durée maximale de l’invocation ; ce n’est pas une file persistante avec reprise automatique. Les délais, suppressions, rebonds et erreurs de notification restent à raccorder à la supervision. Une demande peut être acceptée publiquement alors que son envoi échoue ; ce comportement évite de révéler l’existence d’un compte.

Les tests utilisent des faux comptes et un fournisseur simulé. Ils vérifient configuration, format du lien, absence de suivi, réponses uniformes, erreurs sans secrets et cohérence d’un changement déjà enregistré. Les 11 tests Redis précédents couvrent expiration, usage unique et concurrence des jetons. La réception réelle du lien, sa complétion, l’invalidation d’une ancienne session et la réception de la notification doivent encore être testées sur un compte de préproduction prévu à cet effet.

Références : [API Mail Send](https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send), [vérification d’un expéditeur](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification), [Next.js after](https://nextjs.org/docs/15/app/api-reference/functions/after), [OWASP récupération de mot de passe](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Isolation des essais

`ACCOUNT_STORAGE_NAMESPACE=local` en développement et `ACCOUNT_STORAGE_NAMESPACE=preprod` en Preview préfixent les clés des comptes et des jetons de récupération. Un Preview sans namespace refuse l’accès aux comptes. Les clés historiques de Production restent inchangées ; définir un namespace en Production est refusé pour éviter une migration implicite. Les utilisateurs de test doivent créer un compte distinct dans chaque environnement. Aucun compte existant n’est déplacé ni copié. Les autres données et les compteurs globaux partagent encore Redis ; cette isolation des comptes ne constitue pas une séparation complète de l’infrastructure.

## Activation locale

L’expéditeur `dimitry.d@innoflexequipe.com`, l’origine `http://localhost:3101` et le namespace `local` sont configurés dans `.env.local`, sans clé dans Git. La récupération est activée pour les comptes locaux isolés. Une création de compte de test locale est nécessaire : les comptes de Production ne sont ni copiés ni utilisés.

Une requête de validation SendGrid avec `sandbox_mode.enable=true` a répondu HTTP 200 sans livraison ; elle valide la forme de l’appel, pas la réception en boîte de réception. La configuration Preview est limitée à `security/session-bound-chat-access`, avec un secret de session propre et le namespace `preprod`. Production n’est pas activée par ces opérations.

## Redis de remplacement raccordé en local

Le blocage DNS de l’ancienne URL est levé pour le profil local : `.env.local` utilise la nouvelle base Upstash dédiée au pilote. Le PING et le parcours serveur de récupération ont été validés sur un compte jetable, supprimé ensuite. Cela ne valide pas encore la livraison SendGrid ni l’interface complète. Les anciennes valeurs restent dans la sauvegarde locale privée ; les comptes de Production n’ont pas été copiés ni modifiés.

## Audit du compte SendGrid — 8 novembre 2026

Vérification en lecture seule dans la session SendGrid de l’utilisateur :

- L’expéditeur `dimitry.d@innoflexequipe.com` est marqué Verified.
- Le domaine `em9866.innoflexequipe.com` est marqué Verified ; ses CNAME de retour et DKIM `s1` / `s2` ainsi que le TXT DMARC sont marqués Verified. La politique DMARC affichée est `p=quarantine` avec alignement souple. Le domaine vérifié n’est pas coché comme domaine par défaut ; SendGrid indique qu’un domaine correspondant au FROM est utilisé en cas de correspondance.
- Les anciennes tentatives `em3504.innoflexequipe.com` et `em5666.innoflexequipe.com` sont marquées Failed et restent conservées. Aucune entrée DNS ni authentification n’a été supprimée.
- Une clé dédiée « Conversational AI » existe, avec accès Mail Send et restrictions sur les autres catégories consultées. Sa valeur n’a pas été affichée ni changée pendant cet audit.
- La liste Dynamic Templates est vide. Le code actuel utilise du contenu `text/plain`, sans `template_id` ; l’absence de template ne bloque donc pas ce code.
- Open Tracking et Click Tracking sont activés globalement. Le code des deux messages de récupération définit explicitement ces suivis à false, y compris les clics en texte brut. Subscription Tracking et Google Analytics Tracking sont désactivés globalement. Aucun réglage global n’a été modifié.
- Lors de cet audit initial, aucun Event Webhook n’était configuré. Un brouillon signé a ensuite été préparé, comme décrit ci-dessous.
- Le compte affiche Trial API & MC, avec une fin d’essai au 8 janvier 2027. La pérennité de l’offre et les limites doivent être revues avant ouverture commerciale.

Cet audit confirme les réglages affichés et leur cohérence avec le code ; il ne confirme pas la réception en boîte de réception. Aucun e-mail réel n’a été envoyé, aucun secret changé et aucun enregistrement supprimé. Prochaines validations : parcours complet sur un compte de test, réception du lien et de la notification, puis remontée signée des événements de livraison.

## Supervision signée des livraisons — préparation

Un endpoint SendGrid « INNOFLEX Conversational AI - Preview » a été enregistré avec signature activée et réception **désactivée**. Il cible `/api/webhooks/sendgrid` sur l’alias de la branche Preview. Les événements sélectionnés sont processed, delivered, deferred, dropped, bounced et spam reports. La protection Vercel empêche encore SendGrid d’atteindre ce Preview ; aucun contournement n’a été partagé.

`SENDGRID_EVENT_PUBLIC_KEY` contient la clé publique de vérification ECDSA P-256 et `SENDGRID_EVENTS_ENABLED=false` garde la collecte inactive. Le serveur vérifie la signature sur les octets bruts avant de lire les événements. Chaque message porte le produit et l’environnement ; les événements étrangers sont ignorés. Les compteurs journaliers UTC restent 30 jours, les empreintes de déduplication 31 jours. Aucune adresse, IP, raison de rebond ou contenu de message n’est conservé dans ces compteurs. Les reprises de SendGrid ne comptent chaque événement qu’une fois ; une panne de stockage répond 503 pour permettre une nouvelle tentative.

`/api/monitoring/email` exige un `EMAIL_MONITORING_TOKEN` serveur distinct par environnement. Le dashboard garde ce jeton dans son fichier privé ignoré `monitoring.local.json`. Sans collecte activée, il affiche « collecte non raccordée » et des compteurs inconnus. Les nombres sont des événements de la journée, pas des utilisateurs uniques ni un taux de livraison. Un Preview protégé reste signalé comme accès requis.

Validation : 80 tests applicatifs et 14 tests Redis passent, dont signature officielle SendGrid, modification du corps, isolation des environnements, doublons concurrents et reprise après compteur corrompu. Aucun e-mail réel n’a été envoyé. La réception réelle et l’activation externe restent à valider avant commercialisation.

### Raccordement externe en attente de confirmation précise

Le 8 novembre, l’utilisateur a autorisé le secret de contournement Vercel destiné à SendGrid. Un secret dédié a été créé et conservé uniquement dans une sauvegarde locale privée ignorée. Le serveur Preview a été redéployé avec `SENDGRID_EVENTS_ENABLED=true` ; un POST sans signature, après passage de la protection Vercel, répond bien `401 Invalid signature`. Cela confirme le refus des appels non signés, pas la réception d’un événement réel.

L’approbation automatique du navigateur a ensuite refusé le collage du secret et l’activation de l’endpoint, demandant une confirmation spécifique à cette action. Vérification du formulaire : URL inchangée, endpoint désactivé, signature activée. Le secret n’a pas été transmis à SendGrid. La collecte fournisseur reste donc inactive ; les compteurs ne constituent pas encore une mesure de livraison réelle. Le dashboard local n’a pas reçu de contournement Vercel pour sa sonde Preview.

### Activation confirmée

Après nouvel accord explicite, l’URL privée a été enregistrée dans SendGrid et le tableau du fournisseur confirme endpoint Enabled et signature Enabled, avec confirmation de sauvegarde. La clé publique reste inchangée. Le serveur Preview refuse toujours un POST non signé avec HTTP 401. La lecture authentifiée des compteurs répond HTTP 200, environnement preview, configured true, compteurs et dernier événement inconnus : aucun événement de livraison réel n’a encore été observé. Aucun e-mail réel n’a été envoyé. Le transfert local temporaire du secret a été arrêté et son onglet fermé.

La sonde automatique du dashboard local n’a pas encore de mécanisme d’accès au Preview protégé ; elle peut donc afficher une indisponibilité de lecture. Cela ne signifie pas une panne du webhook. Le test fournisseur signé puis le parcours réel de récupération restent à réaliser avant de conclure à une livraison opérationnelle.
