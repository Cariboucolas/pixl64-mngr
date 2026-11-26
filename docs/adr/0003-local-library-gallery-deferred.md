# 0003 — Bibliothèque locale ; galerie communautaire reportée
Statut : accepté — 2026-11-26 (rétroactive : décrit le code en place)

## Contexte
La phase 2 visait une galerie du contenu communautaire Divoom, avec un repli sur des favoris locaux si l'accès se révélait impraticable. L'étude faite alors a conclu que la galerie demande un compte Divoom et le déchiffrement de fichiers propriétaires (rapporté par une note de projet, non revérifié).

## Décision
- Le repli est retenu : les images envoyées peuvent être enregistrées localement et renvoyées en un clic.
- La galerie communautaire est reportée à un chantier dédié, hors de la refonte du 2026-11-26.
- Le stockage actuel est un fichier `favorites.json` du plugin store, chaque entrée portant l'image 64 × 64 en data URL PNG.

## Conséquences
- Rien ne dépend d'un compte ni du cloud Divoom pour la bibliothèque.
- Ce stockage ne convient pas aux animations (jusqu'à 59 images par élément dans un seul fichier JSON relu en entier) : le lot 3 de la refonte choisit un autre format et migre les entrées existantes, par une ADR.
- Le vocabulaire passe de « favoris » à « bibliothèque » (voir `GLOSSARY.md`) ; le renommage du code se fait au lot 1.
