<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->

# Imposter Agent Scope

You own only `games/imposter/**` in an Imposter task.

- Keep rules, private-state projection, validation, host UI, controller UI, content, manifest, protocol, tests, and docs inside this directory.
- Export only the public entrypoints declared in `package.json`.
- Read shared platform contracts as needed, but do not modify `apps/**`, `packages/**`, another game, or generated registries.
- If a shared API is genuinely required, stop and open the shared-interface request for Integration/Platform ownership.
- Preserve this directory's `LICENSE`, upstream revision in `THIRD_PARTY_SOURCES.md`, and modification notices. Document rights for every new word list or asset.

Before completion, run from the repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-imposter
npm run build --workspace @open-party-lab/game-imposter
npm run test
npm run legal:check
```
