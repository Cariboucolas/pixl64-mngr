# 0006 — Échanges avec l'appareil à travers des commandes Rust
Statut : proposé — 2026-11-26, à confirmer par l'essai du lot 1

## Contexte
Le front parle aujourd'hui au Pixoo avec le plugin HTTP de Tauri, présent en deux moitiés : un paquet npm et un crate. Dependabot les met à jour séparément ; un désalignement a déjà cassé l'IPC sans que la CI le voie (rapporté par une autre session, non revérifié). Ce plugin impose aussi au webview la permission `http://*:80/post`, soit tout hôte du réseau sur le port 80. Enfin, les animations demandent de décoder GIF, APNG et WebP animé, ce que le webview ne garantit pas sur les trois systèmes (non vérifié).

## Décision
- Le front n'appelle plus l'appareil directement : il passe par une interface `DeviceGateway`, dont l'implémentation de production appelle des commandes Tauri et dont un double sert aux tests.
- Côté Rust, un module `divoom` envoie les commandes à `http://<ip>:80/post`, valide que l'adresse est une IPv4 privée, applique l'intervalle minimal entre requêtes et renvoie des erreurs typées.
- La découverte (`app.divoom-gz.com`) passe par le même module.
- Le plugin HTTP est retiré des deux côtés, ainsi que sa permission.

## Conséquences
- Le client TypeScript et ses tests sont réécrits ; le protocole devient testable par `cargo test`.
- Le décodage des animations peut se faire en Rust.
- Essai à faire avant d'accepter : une commande Rust qui lit les réglages d'un vrai Pixoo et envoie une image fixe, sur macOS au moins. S'il échoue, cette ADR est rejetée, le plugin HTTP reste et le lot 3 décode dans le webview.
