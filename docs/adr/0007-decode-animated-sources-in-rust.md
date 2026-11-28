# 0007 — Décodage des sources animées en Rust
Statut : accepté — 2026-11-27

## Contexte
L'ADR-0005 laissait ouvert le lieu du décodage des sources animées (GIF, APNG, WebP animé), selon l'issue de l'ADR-0006. Celle-ci est confirmée : les échanges avec l'appareil passent par Rust. Le webview, lui, ne garantit pas le décodage image par image de ces trois formats sur macOS, Linux et Windows (non vérifié), et ce décodage ne se teste pas en CI.

## Décision
- Toute source, fixe ou animée, importée par fichier ou par URL, est ouverte par Rust (crate `image`), qui en renvoie les dimensions, le nombre d'images et la première image.
- Le recadrage reste choisi dans l'interface, sur la première image. Pour une animation, Rust applique ce recadrage à toutes les images, les ramène en 64 × 64, puis fait la réduction et calcule la cadence unique.
- Rust garde la source ouverte (ses octets, 20 Mo au plus) et la redécode image par image à chaque rendu : les images en taille d'origine ne sont jamais gardées en mémoire.
- Une image fixe garde son chemin actuel : recadrée dans le webview à partir de la première image.

## Conséquences
- Une dépendance Rust de plus (`image`, limitée aux formats GIF, PNG, JPEG et WebP).
- Recadrage, réduction et cadence se testent par `cargo test`, sur des sources construites dans les tests.
- Deux recadrages coexistent (webview pour l'image fixe, Rust pour l'animation) et doivent donner le même cadre ; un test Rust reprend les cas du test front.
- Bornes : 20 Mo par source, 10 000 pixels de côté, 2 000 images décodées par source ; au-delà, l'import est refusé avec un message.
