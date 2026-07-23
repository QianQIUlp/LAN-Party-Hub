# Tap Race

Fast tap-mash race for Open Party Lab where players sprint by tapping their phone controller.

![In-game screenshot](docs/screenshots/host.png)

## Status

Alpha. The core tap race loop is playable through Open Party Lab. Needs more playtesting for pacing, accessibility, and host feedback polish.

## Run Through Open Party Lab

This repo is not a standalone app. Run it through the Open Party Lab platform.

Recommended layout:

```text
Open-Party-Lab/
  local-games/
    tap-race/
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
Fast tap-mash race for Open Party Lab where players sprint by tapping their phone controller.
```

Suggested topics:

```text
open-party-lab party-game browser-game phaser typescript local-multiplayer tap-race
```

## Package Entrypoints

- `@open-party-lab/game-tap-race/manifest`
- `@open-party-lab/game-tap-race/protocol`
- `@open-party-lab/game-tap-race/server`
- `@open-party-lab/game-tap-race/host`
- `@open-party-lab/game-tap-race/controller`

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
