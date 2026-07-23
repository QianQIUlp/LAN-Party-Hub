<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->

# Draw and Guess Agent Scope

You own only `games/zeichnen-und-erraten/**` in a Draw and Guess task.

- Keep authoritative drawing/guess validation, word content, host UI, controller UI, manifest lobby setup, protocol, tests, and docs inside this directory.
- Export only the public entrypoints declared in `package.json` and declare setup through `manifest.lobbySetup`.
- Read shared platform contracts as needed, but do not modify `apps/**`, `packages/**`, another game, or generated registries.
- If a shared API is genuinely required, stop and open the shared-interface request for Integration/Platform ownership.
- Preserve this directory's `LICENSE`, upstream revision in `THIRD_PARTY_SOURCES.md`, and modification notices. New word lists must have documented provenance and rights.

Before completion, run from the repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-zeichnen-und-erraten
npm run build --workspace @open-party-lab/game-zeichnen-und-erraten
npm run test
npm run legal:check
```
