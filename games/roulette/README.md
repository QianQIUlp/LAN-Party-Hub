# Roulette

Roulette is an original two-player tactical fate duel for LAN Party Hub. The
server owns the hidden charge order, validates every choice, and reveals only
public counts and resolved actions. The host presents the fictional fate device
as code-generated Three.js geometry with idle movement, chamber spins, recoil,
light pulses, and a Phaser HUD; it uses no external model, texture, audio, or
other media asset.

## Match flow

- A match is first to two duel wins.
- Duel one starts at 3 resolve, duel two at 4, and duel three at 5.
- Every load contains 2–8 charges, split as evenly as possible between live and
  blank. Counts are public, but their shuffled order stays on the server.
- On a turn, a player may use any number of valid tools before testing themself
  or their rival.
- A self-targeted blank keeps the turn. Every other test normally passes it.
- A live charge removes one resolve, or two when overcharged.
- Each player draws two tools at the start of a duel and after every reload, up
  to an inventory capacity of eight.

## Tactical tools

- **Field Dressing** restores one resolve up to the current duel maximum.
- **Inspection Lens** privately reveals the current charge on the owner's
  controller.
- **Extractor** publicly removes the current charge without ending the turn.
- **Restraint** skips the rival's next normal action.
- **Overcharge Coil** doubles the damage of the next live test.
- **Polarity Inverter** flips the current charge between live and blank.

The names, presentation, geometry, text, and code in this package are original.
The design uses general hidden-information and push-your-luck mechanics rather
than assets or audiovisual expression from another game.

The shared host renders an original cinematic 3D table. Shots lift and aim the
device before the trigger moves; blanks stop at the mechanical click, while live
rounds add recoil, a visible projectile, impact feedback, and a return to the
full-table view. Tool crates and inventory transfers are animated in-world.

This is a fictional party-game mechanic. It is not an instruction or
simulation of real-world weapon handling.

## Package entrypoints

- `@open-party-lab/game-roulette/manifest`
- `@open-party-lab/game-roulette/protocol`
- `@open-party-lab/game-roulette/server`
- `@open-party-lab/game-roulette/host`
- `@open-party-lab/game-roulette/controller`

## Development checks

From the LAN Party Hub repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-roulette
npm run build --workspace @open-party-lab/game-roulette
npm run test --workspace @open-party-lab/game-roulette
npm run legal:check
```

## License

Code is licensed under the Apache License 2.0. See `LICENSE`.
