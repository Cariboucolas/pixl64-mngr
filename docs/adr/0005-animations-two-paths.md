# 0005 — Animations : décodage dans l'application, lecture directe en complément
Statut : accepté — 2026-11-26

## Contexte
D'après la documentation Divoom (relevée dans `docs/reference/divoom-api.md`), l'appareil accepte une animation de deux façons :
- `Draw/SendHttpGif` : des images RVB brutes en Base64, une requête par image, moins de 60 images, largeur 16, 32 ou 64, une seule cadence en millisecondes pour toute l'animation, jouée en boucle ;
- `Device/PlayTFGif` : un fichier GIF que l'appareil télécharge lui-même par URL ou lit sur sa carte TF, uniquement en 16 × 16, 32 × 32 ou 64 × 64, à partir du firmware 90096.

L'appareil ne décode donc que le GIF, aux tailles exactes.

## Décision
- Voie par défaut : l'application décode la source (GIF, APNG, WebP animé), applique un même recadrage à toutes les images, puis les envoie une à une par `Draw/SendHttpGif`.
- Au-delà de 59 images, l'application en retire à intervalles réguliers, ajuste la cadence pour conserver la durée totale, et le dit à l'utilisateur.
- Les durées variables de la source sont ramenées à une cadence unique, modifiable avant l'envoi.
- Voie complémentaire : quand la source est une URL qui pointe déjà un GIF en 64 × 64, l'utilisateur peut choisir la lecture directe par `Device/PlayTFGif`.

## Conséquences
- Deux chemins à tester et à maintenir ; la lecture directe n'a ni recadrage ni aperçu garanti fidèle.
- En lecture directe, c'est l'appareil qui appelle l'URL depuis le réseau local : les règles de l'ADR-0002 ne s'appliquent pas telles quelles (l'exemple de Divoom est en `http`). Le lot 3 définit ce qui est accepté avant d'ouvrir cette voie.
- Le lieu du décodage (webview ou Rust) dépend de l'ADR-0006.
- Rien de ceci n'a été essayé sur un appareil ; les limites viennent de la documentation.
