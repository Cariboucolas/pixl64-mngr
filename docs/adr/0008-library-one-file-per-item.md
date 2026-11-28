# 0008 — Bibliothèque : un index et un fichier par élément
Statut : accepté — 2026-11-27

## Contexte
La bibliothèque tient dans un seul fichier JSON (`favorites.json`, via le plugin Store), relu en entier au démarrage et réécrit en entier à chaque changement. Chaque élément y est une image PNG en `data:` URL. Une animation de 59 images pèse environ 725 Ko en RVB brut, près de 1 Mo en Base64 : cent animations feraient un fichier de l'ordre de 100 Mo.

## Décision
- La bibliothèque vit dans le dossier de données de l'application, sous `library/` : un `index.json` (version du format, puis pour chaque élément identifiant, type `still` ou `animation`, libellé, date, nombre d'images, cadence) et un fichier `<id>.bin` par élément, qui contient ses images en RVB brut, 12 288 octets chacune, à la suite.
- Lecture et écriture passent par des commandes Rust ; le webview ne reçoit aucune permission d'accès aux fichiers.
- Un élément s'écrit dans un fichier temporaire, renommé ensuite ; l'index est réécrit de la même façon.
- Migration au premier lancement : si `library/index.json` n'existe pas et que `favorites.json` existe, chaque favori est décodé et enregistré comme image fixe, avec son libellé et sa date. `favorites.json` n'est ni modifié ni supprimé.

## Conséquences
- Le front ne charge que l'index, puis les images d'un élément à l'affichage.
- Un favori illisible n'arrête pas la migration : il est compté et signalé.
- Le plugin Store ne sert plus qu'aux réglages.
- Pas de retour arrière automatique : une version antérieure de l'application relit `favorites.json`, sans les éléments ajoutés depuis.
