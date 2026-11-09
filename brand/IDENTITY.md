# INNOFLEX — identité commune, proposition v1

Créée à la demande de l’utilisateur à partir des ressources existantes de son dossier Documents/INNOFLEXEQUIPE. La lecture a été effectuée dans le Finder : le terminal n’a pas accès au contenu de Documents.

## Références réellement consultées

- INNOFLEX STORE/INNOFLEX_STORE_social_sharing_1200x628.jpg : symbole N, bleu marine, bleu vif, blanc, ton professionnel.
- INNOFLEX STUDIOS/Innoflex Studios Logo.png : symbole typographique, fond noir, violet et cyan, identité créative.

Ces images sont des références visuelles, pas une charte donnant des codes exacts. Les couleurs ci-dessous sont une nouvelle proposition combinant leurs principes ; elles ne sont pas présentées comme des valeurs extraites des fichiers. Les ressources originales ne sont pas modifiées. Aucun logo STORE ou STUDIOS n’est utilisé comme logo générique du groupe.

## Une palette, des rôles précis

| Couleur | Code | Rôle |
| --- | --- | --- |
| Marine | #0B1736 | Identité principale, marque, titres |
| Bleu | #2563EB | Action principale, sélection, liens |
| Violet | #7C3AED | Accent secondaire, catégories |
| Cyan | #06B6D4 | Détail du symbole, accent décoratif limité |
| Blanc | #FFFFFF | Documents et surfaces |
| Blanc bleuté | #F8FAFF | Fond général |
| Texte | #172554 | Contenu principal |
| Gris bleu | #52627A | Contenu secondaire |
| Bordure | #DBE3F0 | Séparateurs et structure |

Le texte sur bouton bleu reste blanc. Le cyan n’est pas une couleur de petit texte sur fond blanc. Le dégradé bleu/violet/cyan est limité à un petit repère de marque, jamais aux paragraphes ou à toute une page. Vérifier les contrastes lorsqu’un nouveau composant combine des couleurs.

Vert, ambre et rouge sont réservés aux états métier/santé avec un libellé ou une icône ; ils ne deviennent pas des variantes de marque. Ne pas remplacer mécaniquement les couleurs de statut dans le dashboard.

## Marque et produit

INNOFLEX est la marque commune. INNOFLEX SI est le nom affiché de l’assistant personnel ; le nom n’implique aucune certification ou capacité de superintelligence. Le nouveau symbole N en SVG est une création distincte adaptée aux petites interfaces, sans halo lumineux. Les variantes produit doivent réutiliser ce symbole, la palette et la typographie. Garder un espace libre équivalent à un quart de la hauteur du symbole ; ne pas l’étirer ou lui ajouter une ombre.

La typographie d’interface reste Geist Sans ; Geist Mono sert aux valeurs techniques. Les fonds restent calmes, les boutons sobres, et les exemples sont clairement identifiés. Aucun témoignage, compteur client, badge de conformité ou promesse commerciale inventé.

## Fichiers réutilisables et état du déploiement

- `tokens.json` : palette et références structurées.
- `../styles/brand.css` : variables CSS partagées.
- `../public/innoflex-mark.svg` : symbole commun.
- `../components/brand-lockup.tsx` : signature INNOFLEX SI.

La première application est le pilote SI. Les autres dépôts n’ont pas encore été harmonisés : leur adoption doit conserver les contrastes, états d’erreur et couleurs de monitoring. Les noms techniques et les URLs existants ne sont pas une preuve de déploiement de cette identité sur tout le portefeuille.
