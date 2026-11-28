# 0010 — Valider l'adresse résolue et chaque redirection
Statut : accepté — 2026-11-28 (amende l'ADR-0002, complète l'ADR-0009)

## Contexte
L'ADR-0002 notait deux limites : la validation portait sur le nom d'hôte tel qu'il est écrit, pas sur l'adresse obtenue après résolution DNS, et les redirections suivies à l'import n'étaient pas revalidées. Un nom public qui résout ou redirige vers le réseau local n'était donc pas arrêté. Le lot 3 étend l'import par URL aux animations et ajoute la lecture directe (ADR-0009), qui héritait de la première limite.

## Décision
- Un seul chemin pour tout appel vers une URL choisie par l'utilisateur : `open` dans `commands/image.rs`, utilisé par l'import et par le contrôle de lecture directe.
- Chaque nom d'hôte est résolu par Rust ; si une seule des adresses obtenues est de bouclage, privée, de lien local ou réservée, l'appel est refusé. La connexion est ensuite épinglée sur les adresses validées, pour qu'une seconde résolution ne puisse pas en donner d'autres.
- Les redirections sont suivies à la main, 5 au plus, et chaque étape repasse toute la validation (schéma, nom, adresses).
- Plages refusées en plus de celles de l'ADR-0002 : 100.64.0.0/10, 0.0.0.0/8, 198.18.0.0/15, 240.0.0.0/4, 64:ff9b::/96, et les noms `.localhost`. Un point final dans le nom ne contourne plus le refus.
- Le corps d'une image est lu par morceaux et la lecture s'arrête dès 20 Mo dépassés, que la taille soit annoncée ou non.

## Conséquences
- Les limites notées dans l'ADR-0002 sont levées.
- Un nom qui résout à la fois vers une adresse publique et une adresse locale est refusé en entier.
- Les erreurs restent typées et détaillées : l'URL est saisie par l'utilisateur de l'application de bureau, pas par un tiers, et le détail l'aide à comprendre un refus.
- La lecture directe demande ensuite à l'appareil de télécharger lui-même l'URL : sa propre résolution DNS échappe à ce contrôle. Rust ne garantit que ce qu'il a lui-même appelé.
- Non testé : l'épinglage face à un vrai serveur DNS qui change de réponse entre deux résolutions.
