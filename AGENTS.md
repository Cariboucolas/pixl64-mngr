# Contrat d'agent — pixl64-mngr

Application de bureau (macOS, Linux, Windows) qui pilote un afficheur LED Divoom Pixoo-64 sur le réseau local : réglages de l'appareil, envoi d'images et d'animations, bibliothèque locale. Pas de compte, pas de serveur, pas de base de données.

Documentation en français ; code, identifiants, noms de fichiers et messages de commit en anglais. Le `README.md`, public, reste en anglais.

## Ce qui fait autorité

- [GLOSSARY.md](GLOSSARY.md) : le vocabulaire du domaine ; le code et la prose emploient ses mots.
- [docs/adr/](docs/adr/) : les décisions. Un changement qui en contredit une le dit et l'amende par une nouvelle ADR ; on ne réécrit pas une ADR acceptée.
- [docs/specs/2026-11-26-redesign.md](docs/specs/2026-11-26-redesign.md) : la refonte en cours, lot par lot.
- [docs/reference/divoom-api.md](docs/reference/divoom-api.md) : les commandes de l'appareil, relevées dans la documentation Divoom. Avant d'ajouter une commande, la vérifier dans cette documentation, pas de mémoire.

## Architecture

Niveau 2 du socle, une application ([ADR-0001](docs/adr/0001-level-2-tauri-vue.md)) : peu de règles métier, surtout des commandes à envoyer et des images à convertir. Passage au niveau 3 seulement par une ADR.

- Front (`src/`) : Vue 3, Atomic Design — `components/atoms` → `molecules` → `organisms` → `templates` → `pages` ; un composant ne dépend que des niveaux inférieurs et reste de la présentation pure. État dans `stores/` (Pinia), logique dans `services/`.
- Appareil : le front ne parle au Pixoo qu'à travers une interface (`DeviceGateway`), remplaçable par un double en test ([ADR-0006](docs/adr/0006-device-io-through-rust.md)).
- Natif (`src-tauri/`) : commandes Tauri dans `src/commands/`. Tout accès réseau vers une adresse choisie par l'utilisateur passe par Rust et y est validé ([ADR-0002](docs/adr/0002-url-import-through-rust-command.md)).

Écarts assumés au socle :
- Pas de couches `routes → services → repositories` côté natif : il n'y a pas de base de données ; les commandes Tauri tiennent lieu de routes.
- Le classement Atomic Design se fait au lot 1 de la refonte ; d'ici là, `src/components/` est rangé par domaine.

## Commandes

Versions de Node et de pnpm : celles de `.github/workflows/ci.yml`. La CI lance, dans cet ordre :

```sh
pnpm install --frozen-lockfile
pnpm check && pnpm vue-tsc --noEmit && pnpm test && pnpm audit --audit-level=high
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

`pnpm tauri dev` lance l'application ; `pnpm check:fix` formate. Une release part d'un tag `v*` (`release.yml`).

## Règles propres au dépôt

- Test d'abord sur la logique (encodage, conversion d'images, commandes, validation d'URL). Aucun test ne tourne contre un vrai Pixoo : un changement qui touche le protocole se termine par un essai sur l'appareil, fait par le propriétaire, et la PR dit s'il a eu lieu.
- Une branche et une PR par lot ; l'agent ne merge jamais.
- Dependabot merge seul les mises à jour mineures et correctives npm et cargo quand la CI passe ; majeures et GitHub Actions attendent le propriétaire. Les paquets `tauri*` existent en double (npm et cargo) et doivent rester alignés : la CI ne voit pas un désalignement.
- Permissions du webview (`src-tauri/capabilities/`) : les élargir demande une ADR.
