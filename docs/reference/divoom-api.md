# Référence — API HTTP du Divoom Pixoo-64

Relevé de la documentation officielle Divoom (`https://doc.divoom-gz.com/web/#/12`, section PIXOO64), lue le 2026-11-26. Ce fichier ne garde que ce dont le projet se sert ou va se servir ; en cas de doute, la documentation Divoom fait foi. **Rien ici n'a été vérifié sur un appareil.**

La documentation est une application ShowDoc rendue en JavaScript. Son contenu se lit par son API : `POST https://doc.divoom-gz.com/server/index.php?s=/api/item/info` (`item_id=12`) pour le sommaire, `…?s=/api/page/info` (`page_id=<n>`) pour une page. Les numéros de page sont donnés ci-dessous.

## Forme des échanges

- Appareil : `POST http://<ip>:80/post`, corps JSON `{ "Command": "<nom>", … }`, réponse `{ "error_code": 0, … }`.
- Service en ligne : `POST https://app.divoom-gz.com/<chemin>`, réponse `{ "ReturnCode": 0, "ReturnMessage": "", … }`.
- `Draw/CommandList` (page 241, firmware ≥ 90102) exécute un tableau de commandes en une requête.

« Code » : la commande est déjà construite dans `src/services/divoom/`.

## Découverte et état

| Commande | Paramètres | Notes | Page | Code |
|---|---|---|---|---|
| `Device/ReturnSameLANDevice` (en ligne) | — | Renvoie `DeviceList` : `DeviceName`, `DeviceId`, `DevicePrivateIP`, `DeviceMac` | 336 | oui |
| `Channel/GetAllConf` | — | Firmware ≥ 90104. `Brightness`, `RotationFlag`, `ClockTime`, `GalleryTime`, `SingleGalleyTime`, `PowerOnChannelId`, `GalleryShowTimeFlag`, `CurClockId`, `Time24Flag`, `TemperatureMode`, `GyrateAngle`, `MirrorFlag`, `LightSwitch` | 243 | oui |
| `Channel/GetIndex` | — | Renvoie `SelectIndex` | 240 | non |

## Canaux et cadrans

| Commande | Paramètres | Notes | Page | Code |
|---|---|---|---|---|
| `Channel/SetIndex` | `SelectIndex` | 0 cadrans, 1 cloud, 2 visualiseur, 3 personnalisé, 4 écran noir | 89 | oui |
| `Channel/SetCustomPageIndex` | `CustomPageIndex` 0–2 | Page du canal personnalisé | 90 | non |
| `Channel/SetEqPosition` | `EqPosition` ≥ 0 | Style du visualiseur | 91 | non |
| `Channel/CloudIndex` | `Index` | 0 recommandés, 1 favoris, 2 artistes suivis, 3 album | 95 | non |
| `Channel/GetDialType` (en ligne) | — | Renvoie `DialTypeList` (noms de catégories) | 189 | non |
| `Channel/GetDialList` (en ligne) | `DialType`, `Page` | 30 par page ; renvoie `TotalNum`, `DialList[{ClockId, Name}]` | 190 | non |
| `Channel/SetClockSelectId` | `ClockId` | Affiche ce cadran | 92 | non |
| `Channel/GetClockInfo` | — | Renvoie `ClockId`, `Brightness` | 239 | non |

## Réglages

| Commande | Paramètres | Notes | Page | Code |
|---|---|---|---|---|
| `Channel/SetBrightness` | `Brightness` 0–100 | | 196 | oui |
| `Channel/OnOffScreen` | `OnOff` 1 / 0 | | 223 | oui |
| `Device/SetScreenRotationAngle` | `Mode` 0, 1 (90°), 2 (180°), 3 (270°) | Firmware > 90107 ; non conservé à l'extinction | 339 | oui, sans interface |
| `Device/SetMirrorMode` | `Mode` 0 / 1 | Idem | 340 | oui, sans interface |
| `Device/SetTime24Flag` | `Mode` 1 (24 h) / 0 (12 h) | Idem | 341 | non |
| `Device/SetHighLightMode` | `Mode` 0 / 1 | Idem | 342 | non |
| `Device/SetWhiteBalance` | `RValue`, `GValue`, `BValue` 0–100 | Idem | 343 | non |
| `Sys/TimeZone` | `TimeZoneValue` (ex. `GMT-5`) | | 221 | non |
| `Device/SetUTC` | `Utc` (secondes) | | 222 | non |

## Images et animations

| Commande | Paramètres | Notes | Page | Code |
|---|---|---|---|---|
| `Draw/SendHttpGif` | `PicNum`, `PicWidth`, `PicOffset`, `PicID`, `PicSpeed`, `PicData` | Voir ci-dessous | 93 | oui, une image |
| `Draw/GetHttpGifId` | — | Renvoie `PicId`, le prochain identifiant ; firmware ≥ 90095 | 192 | non |
| `Draw/ResetHttpGifId` | — | Les identifiants repartent de 1 | 236 | oui |
| `Device/PlayTFGif` | `FileType`, `FileName` | Voir ci-dessous ; firmware ≥ 90096 | 195 | non |
| `Device/GetImgUploadList`, `Device/GetImgLikeList` (en ligne) | `DeviceId`, `DeviceMac`, `Page` | Renvoient `ImgList[{FileName, FileId}]` | 461, 462 | non |
| `Draw/SendRemote` | `FileId` | Joue un fichier des deux listes ci-dessus | 460 | non |

`Draw/SendHttpGif` :
- une image par requête ; une animation de N images s'envoie en N requêtes, dans l'ordre, `PicOffset` de 0 à N − 1 ;
- `PicNum` : nombre total d'images, **inférieur à 60** ;
- `PicWidth` : 16, 32 ou 64 ;
- `PicID` : identifiant de l'animation, à partir de 1, supérieur à celui de l'envoi précédent ;
- `PicSpeed` : durée d'une image en millisecondes, une seule valeur pour toute l'animation ;
- `PicData` : octets RVB en Base64, de gauche à droite et de haut en bas (64 × 64 × 3 = 12 288 octets) ;
- l'appareil joue l'animation en boucle.

`Device/PlayTFGif` :
- `FileType` 2 : `FileName` est une URL que l'appareil télécharge (exemple Divoom : `http://f.divoom-gz.com/64_64.gif`) ; 0 : un fichier de la carte TF ; 1 : un dossier de la carte TF ;
- fichiers GIF uniquement, en 16 × 16, 32 × 32 ou 64 × 64.

## Texte

| Commande | Paramètres | Notes | Page | Code |
|---|---|---|---|---|
| `Draw/SendHttpText` | `TextId` < 20, `x`, `y`, `dir` 0 gauche / 1 droite, `font` 0–7, `TextWidth` entre 16 et 64, `TextString` UTF-8 < 512, `speed` ms par pas, `color` `#RRGGBB`, `align` 1 / 2 / 3 | S'ajoute à l'animation en cours, après un `Draw/SendHttpGif` ; une ligne de 16 points de haut, défile si trop longue ; firmware ≥ 90102 | 219 | non |
| `Draw/ClearHttpText` | — | Efface tous les textes | 232 | oui |
| `Device/GetTimeDialFontList` (en ligne) | — | Polices utilisables par `Draw/SendHttpItemList` | 233 | non |
| `Draw/SendHttpItemList` | `ItemList[…]` | Éléments composés (heure, température, texte venant d'une URL) | 234 | non |

## Outils

| Commande | Paramètres | Notes | Page | Code |
|---|---|---|---|---|
| `Tools/SetTimer` | `Minute`, `Second`, `Status` 1 départ / 0 arrêt | Minuteur | 224 | non |
| `Tools/SetStopWatch` | `Status` 2 remise à zéro / 1 départ / 0 arrêt | Chronomètre | 225 | non |
| `Tools/SetScoreBoard` | `BlueScore`, `RedScore` 0–999 | Tableau de score | 226 | non |
| `Tools/SetNoiseStatus` | `NoiseStatus` 1 / 0 | Sonomètre | 227 | non |
| `Device/PlayBuzzer` | `ActiveTimeInCycle`, `OffTimeInCycle`, `PlayTotalTime` (ms) | Firmware > 90109 | 347 | non |

## Ce que la documentation ne dit pas

- Aucun débit maximal de requêtes n'y figure. L'intervalle de 35 ms du client actuel vient d'observations de la communauté, non vérifiées.
- Elle ne dit pas comment lire la version du firmware.
- Le redémarrage (`Device/SysReboot`, page 610) passe par MQTT, pas par HTTP.
