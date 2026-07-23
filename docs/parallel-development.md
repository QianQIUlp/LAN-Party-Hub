<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->

# Parallel development with agents and worktrees

The unit of parallel work is one independent game or one bounded platform feature. Multiple agents must not freely edit the same worktree or shared protocol.

## Roles and ownership

| Role | Writable paths | Default responsibility |
| --- | --- | --- |
| Integration | repository-wide only for integration fixes | architecture decisions, review, merge order, full regression, release readiness |
| Platform | `apps/**`, `packages/**`, platform scripts and matching tests/docs | rooms, identity, reconnect, protocol, shared layouts, LAN and Windows behavior |
| Game | exactly one `games/<game-id>/**` | manifest, game protocol, authoritative rules, host, controller, content, tests and README |
| QA | `tests/**`, test tooling and playtest reports | reproduce, automate and report; core fixes require a separate fix branch |
| Documentation/legal | `docs/**`, root notices and provenance files | attribution, contributor guidance and release documentation |

A game agent may read shared packages but may not edit them. If a game needs a shared API change, it must stop the workaround, write an interface request, and wait for Integration/Platform approval.

## Branches and worktrees

Use one short-lived `codex/` branch and one worktree per task:

```bash
git fetch origin
git worktree add ../lan-party-platform -b codex/platform-reconnect origin/main
git worktree add ../lan-party-tap-race -b codex/game-tap-race origin/main
git worktree add ../lan-party-imposter -b codex/game-imposter origin/main
git worktree add ../lan-party-qa -b codex/qa-offline-smoke origin/main
```

Never attach two active agents to the same worktree. Never develop directly on protected `main`. Rebase or merge the latest `origin/main` before final verification according to the maintainer's preferred history policy.

## Task contract

Every parallel task must state:

- concrete outcome;
- writable paths;
- forbidden paths;
- existing input/output contract;
- acceptance criteria;
- test commands;
- whether it changes shared protocol, assets, content, licenses, or provenance.

If the task cannot fit one owner without overlapping another active task, Integration must split or sequence it before implementation begins.

## Shared-interface request flow

```text
Game/QA discovers shared need
→ opens a shared-interface request
→ Integration decides whether it is truly reusable
→ Platform changes contract and tests first
→ dependent branch synchronizes main
→ game implementation continues
```

Decision rules:

- one game only: keep it inside the game;
- several games: consider `game-core` or a reusable controller layout;
- identity, room, transport, security, timing, score authority: Platform owns it;
- visual-only reuse: consider `ui-kit`;
- uncertain reuse: keep it local until a second use exists.

## Merge order

1. Shared protocol/SDK contract and migration tests.
2. Platform implementation and compatibility layer.
3. Dependent game branches synchronize the updated base.
4. Game PRs merge one at a time.
5. QA runs `npm run verify`, `npm run test:e2e`, and release checks where applicable.

The Integration owner must reject hidden shared-package edits in a game PR, generated registries, unrelated refactors, or undocumented rights-sensitive content.

## Verification matrix

| Changed area | Required checks |
| --- | --- |
| One `games/<id>/**` | game typecheck/build, relevant unit tests, platform browser smoke |
| `packages/protocol/**` or `packages/game-core/**` | all game and platform typechecks, unit/integration tests, full build |
| `apps/server/**` | room/reconnect/security integration tests, all game tests, full build |
| host/controller/shared UI | typecheck, both desktop and phone visual QA, build |
| release/launcher | `npm run verify`, Playwright, Windows release smoke |
| licensing/provenance/assets | `npm run legal:check`, rights documentation, reviewer approval |

## Recommended initial concurrency

Start with one Integration owner, one Platform agent, two Game agents, and one QA agent. Add more game agents only after the game contract and template have remained stable across at least two independent games.
