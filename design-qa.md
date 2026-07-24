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
