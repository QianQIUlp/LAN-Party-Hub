<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->
# AI Agent Guide

This file is for AI coding agents and humans using them.

## Parallel Ownership (Mandatory)

- Every task uses its own `codex/` branch and Git worktree. Never attach two active agents to one worktree and never develop on protected `main`.
- The Integration owner controls merge order, shared contracts, release readiness, and repository-wide fixes.
- A Platform agent may modify `apps/**`, `packages/**`, platform scripts, and matching tests/docs only within its assigned feature.
- A Game agent owns exactly one `games/<game-id>/**` directory. It may read shared packages but must not modify `apps/**`, `packages/**`, another game, or generated registries.
- A QA agent defaults to `tests/**` and test tooling. It reports core defects or fixes them on a separate `codex/fix-*` branch with Platform ownership.
- If a game needs a shared API, stop and open the shared-interface request. Platform lands the contract and tests before the game branch synchronizes and continues.
- Full role, worktree, merge-order, task-contract, and verification rules are in `docs/parallel-development.md`.

## License and Provenance (Mandatory)

- Never remove or replace `LICENSE`, the preserved upstream section of `NOTICE.md`, relevant copyright/license headers, bundled-game licenses, or `THIRD_PARTY_SOURCES.md` entries.
- Existing upstream-derived files changed for LAN Party Hub must retain the standard modification notice near the top. Comment-free formats must be recorded in `config/upstream-modified-files.json`.
- New assets, fonts, audio, word lists, datasets, generated media, and third-party code require source and rights documentation before they enter a public release.
- Run `npm run legal:check`; on a branch that changes an existing unmarked file, run `npm run legal:mark -- --base <target-ref>` and review the result.
- Detailed policy is in `docs/licensing-and-attribution.md`.

## Mental Model

- The server is authoritative. Gameplay rules, timers, scoring, and round transitions belong in `apps/server`.
- The host renders the shared screen. It should not become the source of truth.
- The controller sends player intent and shows phone UI. It should not trust itself for game outcomes.
- Protocol types in `packages/protocol` are the shared room and socket contract between all three apps.
- Game manifests drive availability, display names, player counts, and layout selection.
- Optional external game repos live under `local-games/` during local development and are ignored by this repo.
- Missing optional game repos are normal. Do not add static imports to packages that might not exist locally.
- New external game repos use the short game name as repo and folder name, for example `tap-race`, not an `open-party-game-` prefix.

## Important Entry Points

- Server game registry: `apps/server/src/game-engine/gameRegistry.ts`
- Host game registry: `apps/host/src/games/registry.ts`
- Controller game registry: `apps/controller/src/controller-ui/games/registry.tsx`
- Optional game list: `config/known-games.json`
- Local game generator: `scripts/local-games.mjs`
- Virtual controller helper for AI browser checks: `scripts/virtual-controllers.mjs`
- Host DEV automation bridge for browser checks: `apps/host/src/app/appBootstrap.ts`
- Catalog: `packages/game-core/src/catalog/gameCatalog.ts`
- Shared protocol exports: `packages/protocol/src/index.ts`
- Room lifecycle: `apps/server/src/rooms/roomLifecycle.ts`
- Host router: `apps/host/src/app/router.ts`

## Public Source Boundaries

Do not reintroduce these without maintainer approval:

- private or hidden game prototypes excluded from this public cut
- removed experimental prototypes
- legacy experiment folders
- `Temp/`, `artifacts/`, build output, logs, generated browser profiles, or generated external game registries

## Contribution Rules

- Write all pull request titles, descriptions, review summaries, and reviewer-facing notes in English. Preserve the repository template's exact section headers.
- Format every PR title as `type(scope): subject`, for example `fix(release): publish Windows assets at release root`. Use a lowercase Conventional Commit type and a specific lowercase scope. Do not add `(#123)` manually; GitHub adds the PR number to the squash commit.
- Merge PRs with squash merge only. The repository uses the PR title as the final commit title and leaves the squash commit body blank.
- Keep changes small enough to review.
- Prefer vertical slices: server, protocol, host, controller, and docs together when behavior changes.
- Update `docs/project-status.md` when functionality or limitations change.
- Do not add assets with unclear rights.
- Do not add generated output to source control.
- For new games, follow `docs/minigame-sdk.md` and `docs/multi-repo-games.md`.
- For optional external games, export only the documented package entrypoints and let `npm run games:sync-local` generate platform registries.
- For UI changes, verify both desktop host and phone controller sizes.
- For screenshots and visual QA, prefer Codex in-app browser. Launch external browser executables for screenshots as fallback or if the maintainer explicitly asks for that.
- For AI checks that need players, use `npm run ai:controllers` to add generic virtual controller sessions to an existing room.
- Keep naming, folder structure, state flow, and UI patterns consistent with nearby games before inventing new conventions.
- Treat localization as part of the feature design. User-facing text should be structured so multiple languages can be supported, using the existing language and catalog text patterns instead of scattering hard-coded strings through server, host, and controller code.
- Before creating a new controller layout, check `apps/controller/src/controller-ui/layouts`, `apps/controller/src/controller-ui/layouts/models.ts`, and existing game controller builders. Reuse or extend an existing controller when it fits; add a new one only when the interaction model genuinely needs it.
- When a new controller is needed, keep it generic enough that future games can reuse it and wire it through the registry with clear model types.
- All games in this public cut are alpha. Balance changes, pacing changes, and usability refinements are welcome, but document gameplay-impacting adjustments clearly.

## Verification

Run at least:

```bash
npm run legal:check
npm run typecheck
```

Use `npm run games:list` to see optional local game repos and `npm run games:sync-local` to refresh generated registries.

Run a full build when touching bundling, shared packages, game registries, Vite config, or publish-ready work:

```bash
npm run build
```

If you cannot run a check, state that clearly in the PR.
