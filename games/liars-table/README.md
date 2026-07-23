# Liars Table

Liars Table is an original three-to-four-player bluffing card game for LAN
Party Hub. Players secretly choose cards, publicly claim the current table
sigil, and decide when to challenge the previous claim.

## Rules

- Every player begins with two resolve points and four private cards.
- The table chooses Crown, Moon, or Key as the claim for the current hand.
- On a turn, play one card face down or challenge the previous play.
- A Wild card always satisfies the table claim.
- If a challenge reveals a lie, the accused player faces the fate chamber.
- If the revealed card is truthful, the challenger faces it instead.
- The chamber has one live result among four hidden positions. Its public risk
  increases after every blank and resets after a hit.
- A hit removes one resolve point. The last active player wins three points.

The names, sigils, rules, code, and visual treatment are original. No
third-party character art, audio, card art, or game text is included.

## Package entrypoints

- @open-party-lab/game-liars-table/manifest
- @open-party-lab/game-liars-table/protocol
- @open-party-lab/game-liars-table/server
- @open-party-lab/game-liars-table/host
- @open-party-lab/game-liars-table/controller

## Development checks

From the LAN Party Hub repository root:

    npm run typecheck --workspace @open-party-lab/game-liars-table
    npm run build --workspace @open-party-lab/game-liars-table
    npm run test --workspace @open-party-lab/game-liars-table
    npm run legal:check

## License

Code is licensed under the Apache License 2.0. See LICENSE.
