# Roulette cinematic table design QA

## Comparison target

- Source visual truth:
  - `/home/qiu/.codex/attachments/34e489e6-2dbe-46c5-a00d-dcf83355683b/codex-clipboard-f1cdad6f-80c6-4279-bd90-267eac5808e1.png` — wide table composition, 1570 x 766 px.
  - `/home/qiu/.codex/attachments/2d2b0a9c-c5af-4f5b-b55e-c0cf75811c73/codex-clipboard-1be6cd67-261a-4db5-832e-8894243cc902.png` — status close-up, 1453 x 741 px.
  - `/home/qiu/.codex/attachments/d8c0ee79-dd93-44bb-9792-6ed89e6e1a12/codex-clipboard-9b7e2b2c-0914-40fe-8e47-4720c73492bc.png` — open item case, 1500 x 799 px.
- Browser-rendered implementation:
  - `/home/qiu/.codex/visualizations/2026/07/24/roulette-cinematic/wide-final-proof.png` — wide table.
  - `/home/qiu/.codex/visualizations/2026/07/24/roulette-cinematic/device-final-proof.png` — result focus and impact state.
  - `/home/qiu/.codex/visualizations/2026/07/24/roulette-cinematic/crate-final-proof.png` — open case and item flights.
  - `/home/qiu/.codex/visualizations/2026/07/24/roulette-cinematic/controller-final-proof.png` — phone controller.
- Same-input comparison evidence: `/home/qiu/.codex/visualizations/2026/07/24/roulette-cinematic/design-comparison.png`, 1600 x 1522 px.
- Intended relationship: match the references' readable table hierarchy, camera grammar, visible health/status information, and physical item distribution. The dealer, fate device, room, tools, colors, geometry, typography, and motion are an original reinterpretation rather than a replica.

## Capture normalization

- Desktop implementation viewport: 1536 x 768 CSS px, `deviceScaleFactor: 1`; screenshots are 1536 x 768 px.
- Phone controller viewport: 390 x 1014 CSS px, `deviceScaleFactor: 1`; screenshot is 390 x 1014 px. An additional 360 x 800 flow was exercised without overflow.
- Comparison canvas: source and implementation captures are placed in equal 740 x 330 CSS-px image slots with `object-fit: contain`, preserving each source crop and aspect ratio. Density is normalized by the browser at `deviceScaleFactor: 1`; no visual finding is based on native-pixel-density differences.
- State: two players joined room `DEBU`, a roulette duel was active, both public inventories were hydrated, and the active player performed item and shot actions.

## Evidence review

### Full-view composition

The wide comparison confirms the requested hierarchy: a deep industrial room, opponent/dealer silhouette, physical table, centered fate device, status terminal, health panels, and separate tool racks. The implementation keeps the table and actionable state brighter than the room so game state remains readable at television distance.

### Focused regions and motion states

- Result focus: `device-final-proof.png` shows a camera push toward the fate device, hides the large player panels, changes the table rim mood, and adds recoil/impact lighting. Shot actions now return directly to the wide table after this short beat so health and turn changes are immediately visible; terminal focus is reserved for terminal-related tool feedback.
- Item distribution: `crate-final-proof.png` shows the lid open and multiple individually modeled tools in flight from the illuminated case toward real player rack slots.
- Status readability: the focused terminal uses live canvas-rendered health, duel wins, and chamber pips rather than a text-only event log.
- Controller: the phone view preserves the existing platform interaction pattern, gives the active player the valid actions, and keeps private inspection results off the host.

## Required fidelity surfaces

- Fonts and typography: the host uses a compact CJK-capable sans-serif hierarchy for player names and prompts plus a monospaced terminal face. Labels remain legible at 1536 x 768 and do not wrap into controls. The type treatment intentionally differs from the source to avoid copying its expression.
- Spacing and layout rhythm: the wide shot has a stable center line, clear left/right ownership, unobstructed center device, and consistent eight-slot racks. Focus modes temporarily remove peripheral panels so the subject is not crowded.
- Colors and visual tokens: warm amber denotes the left/active side, cyan denotes the right side, green denotes terminal information, and red is reserved for impact/danger. Contrast was raised after the first pass while keeping the room dark.
- Image quality and asset fidelity: all visible scene content is native Three.js geometry or a runtime canvas surface; there are no copied screenshots, third-party models, textures, logos, or generated raster assets in the game package. Captures are sharp at native browser density with no transparency halos or stretched imagery.
- Copy and content: host copy is limited to room, current-player, status, health, and duel information. Gameplay explanations and private item outcomes remain on the controller, preventing the shared screen from reverting to a text panel.
- Icons and affordances: six tools have distinct modeled silhouettes and colors in both the flight animation and occupied rack slots. Platform menu controls keep their existing visual language and hit targets.
- Responsiveness and accessibility: desktop host has no horizontal overflow at 1536 x 768. Controller flows were exercised at 390 x 1014 and 360 x 800. Reduced-motion mode keeps the state readable while suppressing the strongest motion, and the non-WebGL fallback remains available.

## Comparison history

### Iteration 1 — blocked

- [P1] The first wide capture was too dark, so the dealer, table boundary, and tool areas were difficult to read (`wide-table.png`).
- [P1] A host joining after the round began could miss the volatile opening state, leaving player panels and tool racks empty until an action occurred (`crate-distribution.png`).
- [P1] Device and terminal focus shots remained too close to the wide framing (`device-focus.png`, `terminal-focus.png`).
- Fixes: raised hemisphere/key/opposing light levels and exposure, added local dealer/table fills, rendered an informative first frame, added host-state polling, and moved focus camera targets closer.
- Post-fix evidence: `wide-table-v2.png`, `device-focus-v2.png`, and `terminal-focus-v2.png` made the table and subjects readable.

### Iteration 2 — blocked

- [P1] Public tool identities still appeared only after the first player action because the reconnecting host did not receive a fresh cloned game-state emission.
- [P2] One camera deadline could be overwritten by a rapid shot/status transition, shortening the intended device-to-terminal sequence.
- [P2] The crate lid and item flights ended too quickly to communicate distribution clearly.
- Fixes: added a read-only host synchronization action, exposed visible rack identities while retaining private shell knowledge, introduced time-bounded camera cues, and extended the lid and flight timing.
- Post-fix evidence: `wide-table-accepted.png`, `crate-t025.png`, and `focus-t018.png` confirmed hydrated inventory, an open case, and a readable focus transition.

### Iteration 3 — passed

- No actionable P0, P1, or P2 mismatch remains for the requested original reinterpretation.
- Final evidence: `design-comparison.png`, `wide-final-proof.png`, `device-final-proof.png`, `crate-final-proof.png`, and `controller-final-proof.png`.
- [P3] The procedural low-poly surfaces are cleaner and less distressed than the photographic source. This is intentional: it keeps the visual identity original, avoids unlicensed assets, and maintains production-preview performance.

## Runtime verification

- Production preview loaded from the unified port with one Three.js overlay canvas.
- Two isolated controller contexts joined the same room; only the active player could submit an action, inventory use and shot resolution updated the host, and the camera/crate sequences completed.
- Desktop and phone pages reported no uncaught page errors or console errors, and the checked viewports had no horizontal overflow.
- Shot-camera regression evidence: `/home/qiu/.codex/visualizations/2026/07/24/roulette-camera-fix/shot-0120.png` captures the short device focus; `shot-1370.png` and `shot-3570.png` show the restored wide table with updated active-player state. `self-shot-1370.png` and `self-shot-3070.png` confirm the same return path for self-targeted shots.

## Implementation checklist

- [x] Replace the text-led host view with a readable cinematic table.
- [x] Show health, duel score, chamber information, and both visible inventories in-world.
- [x] Animate wide, device, terminal, and crate camera states.
- [x] Animate the case opening and tools flying into player slots.
- [x] Preserve server authority and private inspection information.
- [x] Verify production desktop and phone multiplayer paths.

final result: passed
