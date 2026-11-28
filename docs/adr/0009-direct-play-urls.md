# 0009 — URL acceptées en lecture directe
Statut : accepté — 2026-11-27

## Contexte
En lecture directe (`Device/PlayTFGif`, ADR-0005), c'est l'appareil qui télécharge le fichier, depuis le réseau local. L'application ne voit pas ce téléchargement. L'exemple de la documentation Divoom est en `http` ; rien n'y dit si l'appareil sait télécharger en `https`.

## Décision
- Sont acceptées les URL `http` et `https` dont l'hôte est public : mêmes refus que l'ADR-0002 (`localhost`, noms `.local`, adresses de bouclage, privées, de lien local, IPv4 mappées, réservées).
- Avant l'envoi de la commande, Rust télécharge le début du fichier et vérifie que c'est un GIF de 16, 32 ou 64 pixels de côté. Sinon la lecture directe est refusée avec la raison, et l'import normal reste proposé.
- Ce contrôle suit les redirections à la main, cinq au plus, en revalidant chaque adresse.

## Conséquences
- `http` est accepté pour cette seule voie ; l'import normal reste en `https` (ADR-0002).
- Limites : comme pour l'ADR-0002, la validation porte sur le nom d'hôte, pas sur l'adresse résolue ; et l'appareil refait le téléchargement de son côté, il peut donc recevoir autre chose que ce que l'application a contrôlé.
- Pas d'aperçu : l'application ne voit pas ce que l'appareil télécharge ; le panneau revient à l'écran éteint.
- Rien n'a été essayé sur un appareil, `https` compris : à faire à l'essai du lot 3.
