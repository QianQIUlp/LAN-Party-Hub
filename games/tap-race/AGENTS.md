<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->

# Tap Race Agent Scope

You own only `games/tap-race/**` in a Tap Race task.

- Keep authoritative tap rules, rate limits, host UI, controller UI, manifest, protocol, tests, and docs inside this directory.
- Export only `./manifest`, `./protocol`, `./server`, `./host`, and `./controller` as declared in `package.json`.
- Read shared platform contracts as needed, but do not modify `apps/**`, `packages/**`, another game, or generated registries.
- If a shared API is genuinely required, stop and open the shared-interface request for Integration/Platform ownership.
- Preserve this directory's `LICENSE`, upstream revision in `THIRD_PARTY_SOURCES.md`, and modification notices. Do not add rights-unclear assets.

Before completion, run from the repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-tap-race
npm run build --workspace @open-party-lab/game-tap-race
npm run test
npm run legal:check
```
