# Atelier G20 — état du premier parcours

Disponible sur `/trading-journal` : plan personnel, opérations réel/backtest,
modification et clôture des opérations, revue du cycle ou de sept jours à partir d’une date, export/import JSON version 1.
Les filtres utilisent la date d’opération saisie, pas une date de clôture.
Aucune recommandation d’allocation, aucun ordre, aucun appel IA.

## Sauvegarde manuelle

Jusqu’à 50 cycles par compte et par environnement, stockés dans Redis. Chaque cycle possède sa propre révision. Le premier journal reste lisible sans migration destructive. La liste est chargée à la demande ; créer un nouveau brouillon et charger un autre cycle demandent confirmation.
Les actions serveur authentifient la session à chaque lecture/écriture et
construisent la clé depuis cette identité. Le client ne choisit pas le propriétaire.
Les clés séparent production, préproduction et local. La validation normalise
le contenu importé et sauvegardé. La sauvegarde serveur est limitée à 750 Ko.
La révision est contrôlée atomiquement : un onglet ancien ne remplace pas une
sauvegarde plus récente. Le chargement demande confirmation avant remplacement
du brouillon. Aucune sauvegarde automatique à la frappe ; exporter ou enregistrer
avant de recharger. Une panne de stockage reste visible et ne simule pas un succès.

## Limites restantes avant commercialisation

- Vérifier la sauvegarde et la récupération connectées dans le navigateur et en Preview.
- Ajouter la suppression récupérable des cycles et une politique de rétention explicite.
- Ajouter les champs de préparation, confirmations et émotions progressivement.
- Vérifier le rendu mobile, les interactions clavier et les changements d’onglet.
- Les sources privées et formations tierces ne sont pas incluses dans le produit.

Validation : 89 tests applicatifs, 17 tests Redis dans un conteneur temporaire,
compilation Next.js réussie. Les tests Redis couvrent les conflits de révision ;
les tests applicatifs couvrent le cloisonnement des clés et le refus anonyme.

## Vérification manuelle locale

Parcours vérifié dans Chrome le 8 novembre 2026 (heure de Toronto), dans un
nouvel onglet avec une opération entièrement fictive, sans écriture serveur :
création ouverte, réouverture en modification avec champs conservés, passage
à clôturée, résultat de 25,50 CAD et observation, validation puis revue.
La table affiche une seule opération clôturée ; la revue affiche 25,50 CAD,
une clôturée renseignée et aucune ouverte. Les actions de sauvegarde/export et
les autres étapes sont désactivées pendant l’édition puis réactivées à validation.
Le test ne valide pas encore la persistance authentifiée ni la préproduction.
Le brouillon fictif est resté dans l’onglet de test, sans sauvegarde sur un compte.

## Sauvegarde : aller-retour des actions serveur

18 tests Redis passent désormais. Le nouveau scénario exécute les véritables
fonctions `saveTradingDraft` et `loadTradingDraft` contre le conteneur Redis,
avec authentification simulée et adaptateur Redis de test : enregistrement,
nouvelle instance de session, relecture exacte, refus anonyme, isolement d’une
seconde identité, rejet du contenu invalide et des révisions périmées, mise à jour.
Cela ne valide pas les cookies NextAuth ni le transport HTTP des Server Actions.
L’interface distingue maintenant le brouillon courant de la dernière sauvegarde
chargée ou effectuée dans cet onglet ; elle ne prétend pas surveiller en direct
les modifications réalisées depuis un autre onglet.

## Connexion depuis le brouillon

Le lien du journal ouvre la connexion dans un autre onglet. Le brouillon reste
dans son onglet d’origine ; après connexion, y revenir sans recharger pour
l’enregistrer. La destination `/trading-journal` est conservée après connexion
et pour les sessions déjà connectées. Toute autre destination non autorisée
est remplacée par `/`, y compris les URL externes et chemins ambigus.
Le formulaire « Retrouvez votre journal G20 » a été observé dans Chrome le
9 novembre 2026. Aucune authentification réelle n’a été effectuée lors de cette
vérification. Les 90 tests applicatifs passent, dont le contrôle des destinations.

## Préproduction G20

Le premier lot G20 est publié sur la branche `security/session-bound-chat-access`
(commit `3da9a9d`). Le déploiement Vercel a atteint READY. La vérification HTTP
a ensuite révélé que le fournisseur de menu masquait tout le contenu pendant
l’initialisation du stockage navigateur. Ce blocage a été supprimé : le contenu
est rendu immédiatement et une préférence corrompue ou un stockage indisponible
ne bloque plus l’application. Trois tests ciblent ces situations.
La validation réelle des comptes en préproduction reste en cours ; READY ne
signifie pas que le parcours commercial complet est validé.

## Plusieurs cycles

La création d’un nouveau brouillon ne remplace pas un cycle déjà enregistré.
Le choix dans la liste prépare un chargement ; seule la confirmation remplace
le brouillon visible. L’enregistrement vise le cycle affiché, pas la simple
sélection dans la liste. La compatibilité du premier journal sans index est
conservée. La mise à jour de l’index et du cycle est atomique avec contrôle de
révision. Un index invalide ou la limite de 50 cycles ne laisse aucune écriture
partielle. Les tests Redis couvrent deux cycles, leur relecture, l’isolement des
comptes, la compatibilité du journal initial et la limite de collection.

## Parcours produit et discipline

L’accueil public présente désormais le journal de trading et une démonstration
interactive fondée sur des données fictives. `/presentation` permet également
aux utilisateurs connectés de consulter la présentation. L’assistant existant
reste accessible. Aucun abonnement ni paiement n’est annoncé comme disponible.

Les opérations peuvent inclure le sens, le contexte d’entrée, les états avant
et après l’opération et une évaluation déclarée du respect du plan. Ces champs
sont facultatifs : les anciens cycles et exports restent compatibles. La revue
compte les écarts sur les seules évaluations renseignées de la période et ne
déduit aucune appréciation psychologique ou financière. Les exports conservent
les nouveaux champs ; les imports en valident les valeurs et longueurs.

Le cycle affiché et son enregistrement sont accessibles dans une barre dédiée.
Les outils de gestion et d’import sont repliables pour donner la priorité au
plan, à la saisie et à la revue. La confirmation du chargement ouvre la section
correspondante. La taille des champs et les dispositions CSS sont adaptées aux
petits écrans ; la validation visuelle mobile complète reste à effectuer.

Contrôle Chrome local : étapes de démonstration, somme de l’exemple 150 CAD,
un écart sur trois opérations évaluées, accès au journal et présence des champs
métier. 96 tests applicatifs passent. La capture visuelle native a échoué par
expiration du délai ; aucun contrôle graphique mobile n’est donc revendiqué.
