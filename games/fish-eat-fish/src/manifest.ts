// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { GameManifest } from "@open-party-lab/game-core";

export const fishEatFishManifest = {
  id: "fish-eat-fish",
  displayName: "大鱼吃小鱼",
  description: "手机摇杆控制小鱼，吃更小的鱼越长越大，90 秒后体型最大者获胜。",
  minPlayers: 1,
  maxPlayers: 4,
  hostView: "FishEatFishHostScene",
  controllerView: "fish-eat-fish",
  controllerLayout: "virtual_joystick",
  supportsTeams: false,
  estimatedRoundDurationMs: 90_000,
  contentRating: "family"
} as const satisfies GameManifest;

export const manifest = fishEatFishManifest;
