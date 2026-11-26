# 0004 — Refonte : panneau appareil permanent et style matrice LED
Statut : accepté — 2026-11-26

## Contexte
Cinq pages presque vides (le tableau de bord n'affiche qu'une ligne d'état), une fenêtre fixe de 800 × 600, un thème sombre violet sans rapport avec l'objet. Régler la luminosité pendant qu'on prépare une image oblige à changer de page. Trois organisations et trois directions visuelles ont été comparées sur maquettes.

## Décision
- Structure : un panneau appareil permanent à gauche (aperçu 64 × 64, état de la connexion, luminosité, écran, canal, section repliable « Affichage ») ; à droite, quatre onglets : Bibliothèque, Nouveau, Cadrans, Outils. Les pages Tableau de bord et Contrôles disparaissent.
- Style « matrice LED » : fond noir profond, un seul accent ambre, libellés en police à chasse fixe embarquée dans l'application, thème sombre uniquement.
- Les pixels sont des **carrés** séparés par une fine grille noire, dans l'aperçu comme dans les vignettes ; pas de points ronds.
- Fenêtre redimensionnable, d'environ 1000 × 680 à l'ouverture, avec une taille minimale.

## Conséquences
- Écartées : trois pages avec navigation réduite (garde le changement de page pour un réglage) ; bibliothèque plein écran (aperçu de l'appareil trop petit) ; thème clair ; thème violet affiné.
- Pas de mode clair : à rouvrir par une ADR si le besoin apparaît.
- Les couleurs de la maquette sont un point de départ ; le lot 1 fixe les jetons après contrôle des contrastes.
- Les routes et les pages sont réécrites ; le recadrage, les cartes de la bibliothèque et les réglages sont repris comme composants.
