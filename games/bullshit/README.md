# Bullshit

An authoritative, turn-based bluffing card game for LAN Party Hub.

Players receive a shuffled 52-card deck. The lead player declares a rank and
places one or more cards face down. Every following play must claim the same
rank, but the actual cards may be anything. On a turn, a player may add cards,
check the most recent play, or pass once for the current pile.

Checking reveals only the most recent batch. If any revealed card has the wrong
rank, that player takes the whole pile. If every card is truthful, the challenger
takes it. Whoever takes the pile leads the next one. A player who empties their
hand wins only after their final play survives the opportunity to be checked.

## Status

Alpha. The rule engine, private controller projection, host scene, and pixel-art
card-table controller are included. The controller keeps the full hand visible,
supports rank/suit sorting, and lifts selected cards from the fan. Real-device
playtesting is still required for pacing and large-player usability.

## Development

```bash
npm run typecheck
npm run build
```

From the platform repository, run `npm run games:sync-local` before platform
type checks or browser testing.

## Assets and rights

The implementation uses no external card art, fonts, audio, datasets, or media.
The original generated table and card-back assets are documented in
[`assets/README.md`](assets/README.md); card faces use only standard rank and suit
data rendered by the controller.
