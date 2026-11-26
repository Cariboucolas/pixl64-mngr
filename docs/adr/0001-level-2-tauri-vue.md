# 0001 — Niveau 2 du socle, Tauri 2 et Vue 3
Statut : accepté — 2026-11-26

## Contexte
Le projet a commencé avant le socle d'architecture : aucune ADR, composants rangés par domaine, pas de niveau déclaré. La refonte du 2026-11-26 est l'occasion de poser le niveau et de revoir la stack. Mesuré ce jour : environ 3 100 lignes de front, 293 de Rust, 212 tests front et 10 tests Rust verts, installeurs de 3 à 10 Mo.

Options examinées pour la stack : garder Tauri 2 + Vue 3 + Vite ; passer à Nuxt en mode SPA dans Tauri ; passer à Electron ; faire une application web seule.

## Décision
- Niveau 2 (application) : front en Atomic Design complet, logique dans des services et des stores, accès à l'appareil derrière une interface. Raison : peu de règles métier, l'essentiel est d'envoyer des commandes et de convertir des images.
- Stack conservée : Tauri 2, Vue 3, Vite, Pinia, TypeScript, Vitest, Biome ; Rust pour le natif ; CSS simple avec jetons, sans framework CSS.
- Nuxt écarté : le rendu serveur ne sert à rien dans une application de bureau et la refonte ne garde que quelques vues.
- Electron écarté : il faudrait réécrire le natif, la CI de release et le modèle de sécurité, pour des installeurs plus lourds.
- Application web seule écartée : une page servie en HTTPS ne peut en principe pas appeler `http://<ip>/post` sur le réseau local (déduit, non testé).

## Conséquences
- Les composants sont reclassés en `atoms / molecules / organisms / templates / pages` au lot 1 de la refonte.
- Pas de couches `routes → services → repositories` côté natif tant qu'il n'y a pas de données persistées autrement que par fichiers locaux.
- Signaux qui feraient passer au niveau 3 : des invariants d'animation ou de bibliothèque répétés dans plusieurs modules, ou la prise en charge de plusieurs modèles d'appareils.
