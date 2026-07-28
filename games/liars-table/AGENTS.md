# Liars Table Agent Scope

You own only games/liars-table/** in a Liars Table task.

- Keep authoritative card, challenge, chamber, host UI, controller bindings,
  protocol, tests, and documentation inside this directory.
- Export only ./manifest, ./protocol, ./server, ./host, and ./controller as
  declared in package.json.
- Read shared platform contracts as needed, but do not modify apps/**,
  packages/**, another game, or generated registries.
- If a shared API is genuinely required, stop and open a shared-interface
  request for Integration/Platform ownership.
- Do not add character art, audio, fonts, card art, or other assets without
  documented source and rights.

Before completion, run from the repository root:

    npm run typecheck --workspace @open-party-lab/game-liars-table
    npm run build --workspace @open-party-lab/game-liars-table
    npm run test --workspace @open-party-lab/game-liars-table
    npm run legal:check
