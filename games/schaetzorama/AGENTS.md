<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->

# Schaetzorama Agent Scope

You own only `games/schaetzorama/**` in a Schaetzorama task.

- Keep question content, source metadata, authoritative validation/scoring, host UI, controller UI, manifest, protocol, tests, and docs inside this directory.
- Export only the public entrypoints declared in `package.json`.
- Read shared platform contracts as needed, but do not modify `apps/**`, `packages/**`, another game, or generated registries.
- If a shared API is genuinely required, stop and open the shared-interface request for Integration/Platform ownership.
- Preserve this directory's `LICENSE`, upstream revision in `THIRD_PARTY_SOURCES.md`, and modification notices. Questions must remain available offline and carry source/rights metadata.

Before completion, run from the repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-schaetzorama
npm run build --workspace @open-party-lab/game-schaetzorama
npm run test
npm run legal:check
```
