# Bullshit Agent Scope

You own only `games/bullshit/**` in a Bullshit game task.

- Keep card definitions, private hands, authoritative rules, host UI, controller bindings, tests, and docs inside this directory.
- Export only the public entrypoints declared in `package.json`.
- Never expose another player's hand through host or controller state.
- Read shared platform contracts as needed, but do not modify `apps/**`, `packages/**`, another game, or generated registries.
- If a shared API is genuinely required, stop and open the shared-interface request for Integration/Platform ownership.
- Do not add third-party card art, fonts, audio, or other assets without documented source and rights.

Before completion, run from the repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-bullshit
npm run build --workspace @open-party-lab/game-bullshit
npm run test
npm run legal:check
```
