# Fish Eat Fish Agent Scope

You own only games/fish-eat-fish/** in a Fish Eat Fish task.

- Keep authoritative simulation, host UI, controller bindings, protocol, tests,
  and documentation inside this directory.
- Export only ./manifest, ./protocol, ./server, ./host, and ./controller as
  declared in package.json.
- Read shared platform contracts as needed, but do not modify apps/**,
  packages/**, another game, or generated registries.
- If a shared API is genuinely required, stop and open a shared-interface
  request for Integration/Platform ownership.
- Do not add fish imagery, audio, fonts, or other assets without documented
  source and rights.

Before completion, run from the repository root:

    npm run typecheck --workspace @open-party-lab/game-fish-eat-fish
    npm run build --workspace @open-party-lab/game-fish-eat-fish
    npm run test --workspace @open-party-lab/game-fish-eat-fish
    npm run legal:check
