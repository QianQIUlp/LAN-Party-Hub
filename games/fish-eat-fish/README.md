# Fish Eat Fish

Fish Eat Fish is a fast 1-4 player arena game for LAN Party Hub. Every player
steers a fish with a virtual joystick on their phone while the shared host
screen shows the underwater arena. Eat smaller fish to grow, avoid or chase
bigger ones, grab drifting power-ups, and be the biggest fish when the round
ends.

The server owns the whole simulation: fish positions, sizes, eating rules,
power-ups, AI behavior, and round timing are all authoritative. The host only
renders the server state, and the phone controllers only send joystick
directions.

## Round flow

- A round lasts 90 seconds.
- Fish schools, predators, and power-ups scale slightly with every round.
- Eating a smaller fish grows you; being eaten by a player shrinks you to a
  fraction of the winner's size with a short invincibility and escape boost,
  so nobody is ever out of the round.
- At the end, players are ranked by size. First place scores 5 points, then
  3, 2, and 1.

## Controls

- Phone controller: virtual joystick steers the fish; it always faces and
  swims the direction you push.
- 1-4 players are supported. A single player can practice against the fish.

## Implementation notes

- `src/server/simulation.ts` is a self-contained, serializable port of the
  game rules. It never touches DOM, canvas, or sockets.
- The server commits simulation state about every 33 ms during play so host
  and controllers stay smooth without flooding the network.
- Visual effects (bursts, floating size gains, screenshake) travel as small
  event records in the committed state; the host animates them client-side.
- All fish, sea, power-up, and player art is drawn procedurally in the Phaser
  host scene. No image, font, audio, or other media asset is used.

## Package entrypoints

- `@open-party-lab/game-fish-eat-fish/manifest`
- `@open-party-lab/game-fish-eat-fish/protocol`
- `@open-party-lab/game-fish-eat-fish/server`
- `@open-party-lab/game-fish-eat-fish/host`
- `@open-party-lab/game-fish-eat-fish/controller`

## Development checks

From the LAN Party Hub repository root:

```bash
npm run typecheck --workspace @open-party-lab/game-fish-eat-fish
npm run build --workspace @open-party-lab/game-fish-eat-fish
npm run test --workspace @open-party-lab/game-fish-eat-fish
npm run legal:check
```

## License

Code is licensed under the Apache License 2.0. See `LICENSE`.
