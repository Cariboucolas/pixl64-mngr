# 0002 — Import d'image par URL à travers une commande Rust
Statut : accepté — 2026-11-26 (rétroactive : décrit le code en place)

## Contexte
La spec de la phase 2 prévoyait de télécharger l'image depuis le webview avec le plugin HTTP de Tauri, en ouvrant ses permissions à `http://*` et `https://*`. L'URL est saisie par l'utilisateur : ouvrir ainsi le webview l'aurait laissé joindre n'importe quelle adresse, y compris le réseau local.

## Décision
- Le téléchargement se fait dans la commande Rust `fetch_image_bytes`, pas dans le webview.
- Rust valide l'URL avant tout appel : `https` seulement ; refus de `localhost`, des noms `.local`, des adresses de bouclage, privées, de lien local, IPv4 mappées en IPv6 et réservées. Délai de 10 s, réponse de type `image/*`, 20 Mo au plus.
- Le front applique la même validation (`validateImageUrl`) pour répondre vite à l'utilisateur ; c'est un confort, la barrière est en Rust.
- Les permissions du webview restent limitées à `http://*:80/post` et `https://app.divoom-gz.com/*`.

## Conséquences
- Les erreurs traversent l'IPC sous forme typée (`FetchImageError`) et sont traduites côté front.
- Limites connues, lues dans le code et non testées : la validation porte sur le nom d'hôte tel qu'il est écrit, pas sur l'adresse obtenue après résolution DNS ; les redirections suivies par le client HTTP ne sont pas revalidées. Un nom public qui résout ou redirige vers une adresse privée n'est donc pas arrêté. À corriger par un changement dédié, test d'abord.
- La permission `http://*:80/post` disparaît si l'ADR-0006 est confirmée.
