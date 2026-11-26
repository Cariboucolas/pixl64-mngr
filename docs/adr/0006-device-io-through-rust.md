# 0006 — Échanges avec l'appareil à travers des commandes Rust
Statut : accepté — 2026-11-26, après l'essai du lot 1

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

## Essai du 2026-11-26
`cargo test --test device_live -- --ignored`, lancé par le propriétaire sur macOS contre son Pixoo-64 : découverte, lecture des réglages (`Channel/GetAllConf`), du canal et du compteur d'images, puis envoi d'une image fixe ; toutes les réponses portent `error_code: 0`. L'appareil affiche la mire attendue (bord blanc, rouge en haut à gauche, vert en haut à droite, bleu en bas à gauche, ambre en bas à droite) : l'orientation et l'ordre des couleurs sont bons.

L'application lancée par `pnpm tauri dev` a ensuite été essayée par le propriétaire : découverte, connexion, réglages et envoi d'image fonctionnent.

Lancés depuis une session d'agent ou depuis le terminal d'un IDE sans l'autorisation « Réseau local », l'essai et l'application échouent (`No route to host`, « appareil injoignable ») : macOS réserve l'accès au réseau local aux applications que l'utilisateur a autorisées. L'application installée devra obtenir cette autorisation au premier lancement (non vérifié).
