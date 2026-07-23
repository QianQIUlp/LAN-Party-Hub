# Roulette

Roulette is an original two-player chamber bluffing duel for LAN Party Hub.
The server owns the hidden shell order, validates every choice, and reveals
only public counts and resolved shots.

## Rules

- Both players begin with three resolve points.
- Every load contains two live shells and four blanks in a hidden order.
- On a turn, the player targets either themself or their rival.
- A self-targeted blank keeps the turn.
- Every other result passes the turn.
- A live shell removes one resolve point from its target.
- The last player with resolve remaining wins two points.

This is a fictional party-game mechanic. It is not an instruction or
simulation of real-world weapon handling.

## Package entrypoints

- @open-party-lab/game-roulette/manifest
- @open-party-lab/game-roulette/protocol
- @open-party-lab/game-roulette/server
- @open-party-lab/game-roulette/host
- @open-party-lab/game-roulette/controller

## Development checks

From the LAN Party Hub repository root:

    npm run typecheck --workspace @open-party-lab/game-roulette
    npm run build --workspace @open-party-lab/game-roulette
    npm run test --workspace @open-party-lab/game-roulette
    npm run legal:check

## License

Code is licensed under the Apache License 2.0. See LICENSE.
