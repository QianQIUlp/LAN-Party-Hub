// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { GameManifest } from "@open-party-lab/game-core";

export const schaetzoramaManifest = {
  id: "schaetzorama",
  displayName: "估个大概",
  description: "估数字、排顺序、做归类，比比谁更接近真相。",
  minPlayers: 2,
  maxPlayers: 4,
  hostView: "SchaetzoramaHostScene",
  controllerView: "schaetzorama",
  controllerLayout: "schaetzorama",
  supportsTeams: false,
  estimatedRoundDurationMs: 145_000,
  contentRating: "family",
  roundCompletionMode: "wait_for_ready",
  phaseDurations: {
    roundIntroMs: 1_500,
    countdownMs: 2_000,
    lockedMs: 26_000,
    resultMs: 5_000,
    scoreboardMs: 5_000
  }
} as const satisfies GameManifest;

export const manifest = schaetzoramaManifest;
