# Glossaire

Le mot de gauche est celui de l'interface et de la documentation ; l'identifiant est celui du code. Un terme absent d'ici n'a pas de sens métier : l'ajouter avant de l'employer.

| Terme | Identifiant | Définition |
|---|---|---|
| Appareil | `device` | Un Divoom Pixoo-64 joignable sur le réseau local, identifié par son adresse IP. L'application en pilote un à la fois. |
| Découverte | `discovery` | Demande au service en ligne de Divoom de la liste des appareils du même réseau local. Alternative : saisir l'IP à la main. |
| Canal | `channel` | Mode d'affichage de l'appareil : Cadrans (0), Cloud (1), Visualiseur (2), Personnalisé (3), Écran noir (4). Un envoi d'image fait basculer l'appareil sur le canal 4. |
| Cadran | `face` (`ClockId`) | Horloge ou écran d'information fourni par Divoom, affiché sur le canal Cadrans. |
| Image | `frame` | Grille de 64 × 64 pixels en RVB, 3 octets par pixel, lue de gauche à droite et de haut en bas. Unité de tout ce qui s'envoie. |
| Image fixe | `still` | Un envoi d'une seule image. |
| Animation | `animation` | Suite ordonnée de 2 à 59 images jouée en boucle à une cadence unique. |
| Cadence | `frameDurationMs` (`PicSpeed`) | Durée d'affichage de chaque image d'une animation, en millisecondes ; la même pour toutes. |
| Source | `source` | Fichier ou URL importé par l'utilisateur, avant recadrage : PNG, JPEG, WebP, GIF, APNG. |
| Recadrage | `crop` | Choix de la zone carrée de la source qui devient l'image 64 × 64 ; pour une animation, le même recadrage s'applique à toutes les images. |
| Réduction | `frame reduction` | Retrait d'images d'une source animée qui en compte plus de 59, avec ajustement de la cadence pour garder la durée totale. |
| Aperçu | `preview` | Rendu à l'écran, en pixels carrés, de ce que l'appareil affichera. |
| Envoi | `send` | Transmission d'une image fixe ou d'une animation à l'appareil, image par image. |
| Lecture directe | `direct play` | L'appareil télécharge lui-même un fichier GIF déjà en 64 × 64 depuis une URL, sans passer par le recadrage. |
| Bibliothèque | `library` | Collection locale des images fixes et animations enregistrées pour être renvoyées. Remplace « favoris » ; le fichier de stockage garde l'ancien nom jusqu'au nouveau format du lot 3. |
| Élément | `library item` | Une entrée de la bibliothèque : une image fixe ou une animation, avec un libellé facultatif. |
| Texte défilant | `scrolling text` | Ligne de texte superposée par l'appareil à l'image affichée. |
| Outil | `tool` | Fonction intégrée de l'appareil : minuteur, chronomètre, tableau de score, sonomètre, buzzer. |
| Panneau appareil | `device panel` | Zone permanente de l'interface : aperçu, état de la connexion et réglages de l'appareil. |

## Mots à éviter

- « Favori » : dire « élément de la bibliothèque ».
- « GIF » pour désigner une animation : le GIF est un format de source parmi d'autres. La commande Divoom `Draw/SendHttpGif` envoie des images brutes, pas un fichier GIF.
- « Dashboard », « tableau de bord » : la page disparaît avec la refonte.
