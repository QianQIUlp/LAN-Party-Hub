# Bullshit Controller Design QA

## Comparison Setup

- User annotation: `/home/qiu/.codex/attachments/8e9d8afb-75d1-40fb-b625-63ff7439a2e3/codex-clipboard-7d09cad7-bf4b-432a-9ba7-1b37b6861d9e.png`
- Reference-sized implementation: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-reference-size.png`
- Side-by-side comparison: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-comparison.png`
- Desktop implementation: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-wide.png`
- Phone implementation: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-mobile.png`
- Shared-screen implementation: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-copy-host.png`
- Card-flight evidence: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-flight.png`
- Check-impact evidence: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-check.png`
- Concise Check-result toast: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-copy-resolution.png`
- Automated evidence: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-motion-qa.json`

The annotation and reference-sized implementation are both 874 × 522 pixels. The state uses a two-player hand, claim A, and three cards in the active pile. The annotation is the composition target: its arrows request that the right-side pile move into the open table center. It is not a visual-style target, so its red annotations and exact pile placement are not copied as decoration.

## Full-view Comparison

The combined image was inspected at original resolution. The implementation moves the active pile from the right rail to the horizontal center of the wooden table while keeping the curved hand and turn actions anchored below it. At the matched three-card state, three distinct card backs are visible. The pile remains readable without obscuring the claim rail or action dock.

The original wood, plum, coral, gold, indigo, and cream language remains intact. No Balatro artwork, Ace Attorney character, franchise typography, logo, or copied composition is present. The full-screen Check sequence uses an original generated red/cream/black pixel-comic backdrop and project-native typography.

The player-facing copy pass removes routine server narration, duplicated pile and selection summaries, the decorative English kicker, the empty-pile `DROP` marker, and verbose action sentences. The controller now shows only actionable controls plus concise Check, pending-win, and winner events. Event copy appears as a non-blocking toast and fades after 3.2 seconds. The shared screen keeps turn, latest play, claim, pile size, and player counts while removing its rule slogan and direct server-message fallback.

## Motion and Interaction Evidence

- Pile rendering was exercised at counts 1, 2, 3, 4, 5, and 6. Counts 1–5 render the same number of visible card backs; count 6 renders five, so later pile growth no longer changes the silhouette.
- A selected card was captured while following a measured arc from its hand position to the centered pile, flipping from face-up to the project card back before the authoritative play input is sent.
- The original hand card fades only while its animated clone flies. The remaining hand reflows after the server confirms the play.
- Check was captured during its full-screen sequence: short board shake, red/cream impact art, white flash, large `CHECK!` banner, and localized reveal sublabel. The server input is delayed until the impact beat, then the overlay clears automatically.
- Turn, stat, helper-message, pile-count, pile-card, hand-deal, selected-card, sorting, button press, and latest-play label transitions were visually inspected.
- `prefers-reduced-motion: reduce` bypasses the staged action delay and collapses CSS animations and transitions to one millisecond.

## Responsive and Runtime Checks

- Viewports: 1192 × 768 desktop, 874 × 522 reference-sized desktop, and 390 × 844 phone.
- The centered pile remains centered within two pixels of the board midpoint.
- Desktop and phone document dimensions exactly match their viewports with no horizontal or vertical document overflow.
- Exercised: join, ready, choose claim, select cards, six alternating face-down plays, point/suit sorting, Check, and resolution.
- Browser console errors: none.
- Host room errors: none.
- Production controller assets were loaded from the one-port preview at `http://127.0.0.1:3000/controller/`.

## Comparison History

1. Existing visual baseline — passed after the original card hit-map and responsive fan fixes.
2. First motion pass — blocked because the board-level color filter also tinted the Check overlay sepia, muting its intended red impact.
3. Color correction — removed the parent filter while retaining the shake and overlay-local contrast flash. The final capture is red, cream, black, and gold as intended.
4. Final comparison — passed with no actionable P0, P1, or P2 findings.
5. Player-copy pass — passed on the shared screen, 1192 × 768 controller, 874 × 522 controller, and 390 × 844 controller with no empty grid tracks or overlapping labels.

final result: passed

---

# Design QA — Host Lobby Editorial Redesign

## Evidence

- Source visual truth: `/home/qiu/.codex/generated_images/019fb376-6e9f-7912-8bd5-4ed9c8f884df/exec-cedee54b-840a-4c84-9c69-bf9ddde81c52.png`
- Browser-rendered implementation: `/home/qiu/.codex/visualizations/2026/07/30/019fb376-6e9f-7912-8bd5-4ed9c8f884df/homepage-editorial-1769x889.png`
- Full-view comparison: `/home/qiu/.codex/visualizations/2026/07/30/019fb376-6e9f-7912-8bd5-4ed9c8f884df/homepage-editorial-comparison-full.png`
- Focused header/rail/first-row comparison: `/home/qiu/.codex/visualizations/2026/07/30/019fb376-6e9f-7912-8bd5-4ed9c8f884df/homepage-editorial-comparison-focused.png`
- Additional responsive evidence:
  - `homepage-editorial-1638x823.png`
  - `homepage-editorial-1024x576.png`
  - `homepage-editorial-390x844.png`
  - `homepage-editorial-390x844-scrolled.png`
  - `homepage-editorial-390x844-dragged.png`
  - `homepage-editorial-390x844-end.png`
  - `homepage-editorial-de-1769x889.png`
  - `homepage-editorial-join-open.png`
  - `homepage-editorial-settings-open.png`
- Comparison viewport: 1769 × 889 CSS px, device scale factor 1.
- Density normalization: the source is 1769 × 889 physical pixels; the implementation is 1769 × 889 CSS px captured at DPR 1, producing 1769 × 889 physical pixels. No resizing was needed before comparison.
- State: simplified Chinese, empty lobby, 0 players, 8 real catalog games, no selected game, live room code and join URL.
- Browser: Playwright Chromium, headless, reduced motion enabled. The user explicitly approved this browser fallback because the Codex in-app browser was unavailable.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- [P3] The generated mock's subtle paper grain and torn vertical edge are intentionally simplified to a flat warm-paper surface and straight divider. The hierarchy, split composition, palette, and contrast remain faithful without introducing a rights-sensitive decorative raster or a handcrafted faux asset.
- [P3] The mock's sample room code and sample game names differ from the implementation because the implementation renders the authoritative live room and localized real catalog. This is expected product data, not design drift.

## Required Fidelity Surfaces

- Fonts and typography: the display/body/mono hierarchy matches the mock's scale and weight. The implementation uses the existing system-first Chinese/Latin fallback stacks instead of adding an unlicensed font asset. Long German headings and game names fit without clipping in `homepage-editorial-de-1769x889.png`.
- Spacing and layout rhythm: the dark rail, warm catalog canvas, top title/help split, four-column reference grid, two-column medium grid, one-column compact grid, dividers, rounded focus outline, and bottom utility alignment match the selected direction. The 1769 × 889 full comparison and focused comparison show equivalent region proportions and scan order.
- Colors and visual tokens: near-black rail, warm ivory canvas, cobalt focus/action accents, per-game accent colors, muted dividers, and calm red eligibility text match the source intent and retain readable contrast.
- Image quality and asset fidelity: the lobby introduces no stock or generated raster assets. It reuses the product's existing game-icon renderer and generates a real, sharp QR code from the live join URL. There are no placeholder images, transparency halos, or compressed imagery.
- Copy and content: new lobby copy is localized in simplified Chinese, English, and German. Dynamic game names, player limits, duration, content rating, room code, URL, and connection state come from authoritative application data.
- Icons and controls: existing QR, game, menu, fullscreen, phone-controller, and settings visuals are retained. The wide layout aligns the three host utilities along the rail footer; compact layout uses a horizontal bottom dock.

## Interaction And Accessibility Checks

- Join panel opens and closes; its full QR and address remain reachable.
- Host controls open inside the rail and remain within the 1769 × 889 viewport.
- Language switching updates the room to German and synchronizes `document.documentElement.lang` to `de`; switching back to simplified Chinese restores `zh-CN`.
- Pressing `1` with zero players does not select an ineligible game.
- Wheel, pointer-drag, Page/Home/End, and arrow-key scrolling work in the compact catalog; the final game can be scrolled fully above the fixed bottom controls.
- Visible utility targets are 52 × 52 px on the reference viewport; the compact dock remains reachable.
- At 1769, 1024, and 390 px widths, `documentElement.scrollWidth` equals `window.innerWidth`; no horizontal overflow was detected.
- Browser console errors: none. Page errors: none.

## Comparison History

### Pass 1

- [P2] The initial 1024 × 576 rail allowed QR, player status, and empty-state regions to collide.
  - Fix: added shared condensed rail metrics and a reduced short-viewport player treatment.
  - Post-fix evidence: `homepage-editorial-1024x576.png` shows ordered, separated rail sections and visible footer controls.
- [P2] The initial reference implementation underscaled the primary heading, shortcut numbers, game icons, titles, and metadata relative to the selected mock.
  - Fix: recalibrated display/type/icon scales against the equal-pixel focused comparison and added the mock's rounded focus surface.
  - Post-fix evidence: `homepage-editorial-comparison-focused.png` shows aligned header and first-row hierarchy.
- [P2] Compact controls initially formed a vertical right-side stack that obscured card content.
  - Fix: switched the compact game/fullscreen actions to a horizontal bottom dock and added a 100 px compact scroll inset.
  - Post-fix evidence: `homepage-editorial-390x844-end.png` shows the final game fully visible above the dock.

### Pass 2

- Re-captured the reference viewport, compact/medium breakpoints, open overlays, and German state after fixes.
- No remaining actionable P0/P1/P2 issue was visible in either the full-view or focused comparison.

## Implementation Checklist

- [x] Faithful editorial split layout at the selected reference viewport.
- [x] Responsive 4/2/1-column catalog behavior.
- [x] Real QR, room, player, game, and eligibility data.
- [x] Functional join, settings, language, keyboard eligibility, fullscreen/menu controls, and compact scroll.
- [x] Console/page-error check and same-density visual comparison.

## Follow-up Polish

- If the project later adopts a licensed texture asset or a formal icon library, the paper grain, torn divider, and empty-player illustration can be revisited without changing the current layout contract.

final result: passed
