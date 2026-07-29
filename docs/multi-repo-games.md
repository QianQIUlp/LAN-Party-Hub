<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->
# Multi-Repo Games

LAN Party Hub supports optional local game repos. You do not need every game repo. The platform always loads its eight bundled games and additionally loads optional games present under `local-games/` after `npm run games:sync-local`.

## Recommended Layout

Use child repos inside the platform working tree:

```text
LAN-Party-Hub/
  local-games/
    tap-race/
```

`local-games/` is ignored by the platform repo, so each child folder can be its own Git repository.

New game repos should use the short game name as the repo and folder name, for example `tap-race` or `light-trails`, not an `open-party-game-` prefix. The npm package name may still use `@open-party-lab/game-<game-id>`.

The generator also accepts the older sibling layout as a fallback:

```text
OpenParty/
  LAN-Party-Hub/
  tap-race/
```

## Commands

List known optional games:

```bash
npm run games:list
```

Clone optional games:

```bash
git clone https://github.com/Hartwich/magic-arena.git local-games/magic-arena
git clone https://github.com/Hartwich/magic-duell.git local-games/magic-duell
git clone https://github.com/Hartwich/tap-race.git local-games/tap-race
git clone https://github.com/Hartwich/air-hockey.git local-games/air-hockey
git clone https://github.com/QianQIUlp/buzzwort.git local-games/buzzwort
git clone https://github.com/Hartwich/imposter.git local-games/imposter
git clone https://github.com/Hartwich/schaetzorama.git local-games/schaetzorama
git clone https://github.com/Hartwich/light-trails.git local-games/light-trails
git clone https://github.com/Hartwich/drift-racer.git local-games/drift-racer
git clone https://github.com/Hartwich/word-tiles.git local-games/word-tiles
git clone https://github.com/Hartwich/zeichnen-und-erraten.git local-games/zeichnen-und-erraten
git clone https://github.com/Hartwich/arena-survivor.git local-games/arena-survivor
git clone https://github.com/Hartwich/minions-td.git local-games/minions-td
git clone https://github.com/Hartwich/chaos-kommando.git local-games/chaos-kommando
```

Link local games:

```bash
npm run games:sync-local
```

Clear local links:

```bash
npm run games:clear-local
```

Normal scripts call the sync step automatically:

```bash
npm run typecheck
npm run build
npm run dev:all
```

## Game Package Contract

External games expose only these public entrypoints:

```text
@open-party-lab/game-tap-race/manifest
@open-party-lab/game-tap-race/protocol
@open-party-lab/game-tap-race/server
@open-party-lab/game-tap-race/host
@open-party-lab/game-tap-race/controller
```

For Magic Arena, Magic Duell, Air Hockey, Buzzwort, Imposter, Schaetzorama, Light Trails, Drift Racer, Word Tiles, Zeichnen & Erraten, Arena Survivor, MinionsTD, and Chaos-Kommando, the same contract uses the matching package name such as `@open-party-lab/game-magic-arena/...` or `@open-party-lab/game-chaos-kommando/...`.

Buzzwort supersedes the former Tabu repo and uses the `buzzwort` game ID, the `@open-party-lab/game-buzzwort` package, and the reusable `secret_card` controller layout. Existing checkouts under `local-games/tabu` or `../tabu` remain valid fallback candidates. If such a checkout still exports the legacy `tabu` manifest, the platform keeps loading it under that old game ID; the shared Tabu protocol and catalog entries remain exported for compatibility. New clones should always use `local-games/buzzwort`.

The platform catalog and shared controller contract provide German, English, and Simplified Chinese integration text. The inspected external revision `10f336ecb14400e505e67b6476aaa188712539c9` still contains German and English gameplay text and cards only. A complete Chinese session therefore requires syncing a later Buzzwort game revision that adds `zh-CN` server, Host, Controller, and card content; do not treat platform catalog localization alone as complete gameplay localization.

The platform generates registry imports only for local repos that exist and build successfully. Missing repos are skipped.

Game-owned public assets may be placed under `public/host/` or `public/controller/` for one surface. Assets needed by both surfaces belong under `public/shared/`. `npm run games:sync-local` copies shared assets into both application public roots before development and production builds. Keep the game ID as the first directory below each public root, for example `public/shared/auction-king/images/`, so optional games cannot overwrite another game's files.

## Lobby Setup Boundary

The platform owns generic lobby/setup rendering, navigation, room snapshots, and start-button behavior. Game repos own game-specific setup declarations and validation.

For common host setup controls, add `lobbySetup` to the game manifest. The platform currently renders reusable `select` and `number` fields and sends host actions shaped like:

```ts
{
  type: "configure-lobby",
  [actionKey]: value
}
```

The game server must validate that action and persist trusted values through `roomSettings`. Do not add static Platform imports for optional game setup data.

For common controller-side player setup, add `playerSetup` to the game manifest. The platform renders reusable `choice` and `multi-select` flows and persists trusted values per player for the selected game. Game servers receive those values through `context.players[].setupSelections`.

## AI Agent Workflow

Use the Codex in-app browser for visual checks and screenshots. Do not fall back to external browser executables for README or QA screenshots unless the maintainer explicitly asks for that.

Virtual controllers can be joined to an existing browser-hosted room without opening phone browser tabs:

```bash
npm run ai:controllers -- --room DEBU --players 4 --ready true --hold-ms 600000
```

The helper is game-agnostic. If a game needs input during the check, pass that game's input shape as JSON:

```bash
npm run ai:controllers -- --room DEBU --players 4 --input-json "{\"type\":\"tap\"}" --input-duration-ms 3000
```

When working on one game, open that game repo directly and run:

```bash
npm install
npm run typecheck
npm run build
```

Then test it through the platform:

```bash
cd ../..
npm run games:sync-local
npm run typecheck
npm run dev:all
```

If Firefox is used as a phone controller, verify carefully. Chromium-based browsers and Safari are recommended because Firefox can show issues around fullscreen, reconnect/session handling, or touch timing.
