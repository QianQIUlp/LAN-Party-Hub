# Zeichnen & Erraten

Drawing and guessing party game for Open Party Lab with phone drawing controls and word categories.

![In-game screenshot](docs/screenshots/host.png)

## Status

Beta. The drawing and guessing loop is already good to play locally. Still needs drawing-feel refinement, category/content review, and result presentation polish before a stable release.

## Run Through Open Party Lab

This repo is not a standalone app. Run it through the Open Party Lab platform.

Recommended layout:

```text
Open-Party-Lab/
  local-games/
    zeichnen-und-erraten/
```

From the Platform repo:

```bash
npm install
npm run games:sync-local
npm run dev:all
```

The Platform loads this game only when the repo exists locally and `npm run games:sync-local` links it. Missing optional games are skipped.

## GitHub Metadata

Description:

```text
Drawing and guessing party game for Open Party Lab with phone drawing controls and word categories.
```

Suggested topics:

```text
open-party-lab party-game browser-game phaser typescript local-multiplayer drawing-game
```

## Package Entrypoints

- `@open-party-lab/game-zeichnen-und-erraten/manifest`
- `@open-party-lab/game-zeichnen-und-erraten/protocol`
- `@open-party-lab/game-zeichnen-und-erraten/server`
- `@open-party-lab/game-zeichnen-und-erraten/host`
- `@open-party-lab/game-zeichnen-und-erraten/controller`

The Platform should import only these public entrypoints.

## Development Checks

```bash
npm install
npm run typecheck
npm run build
npm run pack:dry-run
```

For visual checks, start Open Party Lab, add virtual controllers when needed, and capture host screenshots through a browser.

## License

Code is licensed under the Apache License 2.0. See [LICENSE](LICENSE).

Assets, generated media, word lists, prompts, and third-party references may need separate rights review before public store distribution.
