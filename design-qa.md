# Bullshit Controller Design QA

## Comparison Setup

- Source visual truth: `/home/qiu/.codex/attachments/47586d48-d308-4220-8089-46f7b9d75895/codex-clipboard-e0f2eba9-ab38-4327-8ad8-9fd1b94ddd96.png`
- Rendered implementation: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-controller-wide.png`
- Responsive implementation: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-controller-mobile.png`
- Combined comparison evidence: `/home/qiu/.codex/visualizations/2026/07/23/019f8ed9-f77e-7a71-b5a8-c92b48b1f3ba/bullshit-source-implementation-compare.png`
- Source pixels: 1191 × 372; normalized with nearest-neighbour sampling to 1192 × 368 for comparison.
- Implementation viewport and pixels: 1192 × 368 CSS px and 1192 × 368 image px, device scale factor 1.
- Responsive viewport and pixels: 390 × 844 CSS px and 390 × 844 image px, device scale factor 1.
- State: Chinese, active player's turn, claimed A selected, one card selected, two-player 26-card hand, empty table pile.

The source is used only for information hierarchy and element composition. The user explicitly rejected a visual clone, so green felt, the source HUD, illustrated face cards, card-back motif, and palette are not fidelity targets.

## Full-view Comparison Evidence

The combined image was inspected at original resolution. Both screens keep the same primary hierarchy—game state, visible hand, sorting controls, face-down pile, and three turn actions—but the implementation deliberately relocates those elements onto an original warm pixel-wood table. It does not reuse the source's deep-green surface, left score rail, character cards, orange card back, or decorative language.

No separate focused crop was required: at the native 1192 × 368 comparison size, rank labels, sort controls, individual card corners, pile count, and action labels are all readable. A separate 390 × 844 capture was inspected for the responsive state because that behavior is absent from the source image.

## Required Fidelity Surfaces

- Fonts and typography: the interface uses a system monospace stack with hard pixel-style shadows, strong optical weights for short labels, and compact line heights. Chinese helper copy remains readable at both viewports; no external or copied display font is used.
- Spacing and layout rhythm: the desktop view fits exactly inside 1192 × 368 with no document overflow; the action dock remains fully visible. The 390 × 844 view also has no document overflow. A long two-player hand scrolls horizontally while keeping the table, pile, and actions fixed.
- Colors and visual tokens: warm oak, plum, coral, gold, indigo, and cream replace the source's green/cyan/red casino palette. Turn, selection, disabled, and primary-action states remain distinguishable with high-contrast hard borders.
- Image quality and asset fidelity: the table and card back are original generated pixel assets documented in `games/bullshit/assets/README.md`, downscaled with nearest-neighbour sampling and rendered with pixelated image scaling. The source's illustrated face cards and card back were intentionally not reproduced.
- Copy and content: Chinese labels communicate hand count, selected count, pile count, fixed claim, rank/suit sorting, play, Check, and pass. The helper text explicitly explains that actual cards may differ from the claim.

## Comparison History

1. Initial interaction pass — blocked.
   - [P1] Overlapping visual cards intercepted center clicks on earlier cards.
   - Fix: separated visual cards from an accessible segmented hit map, added hover/focus lifting, and made long hands horizontally scrollable so hit regions do not overlap.
   - Post-fix evidence: a 26-card mobile hand exposes approximately 26 px per hit segment; automated clicks select the first card successfully.
2. Initial responsive capture — blocked.
   - [P2] The first selected card was clipped at x = -17.30 px on the 390 px viewport, card curves touched the action dock, and the fullscreen control covered a header statistic.
   - Fix: added responsive fan insets and overflow scrolling, raised the cards 18 px above the dock, reserved header space for the fullscreen control, and removed the duplicate mobile pile statistic.
   - Post-fix evidence: the selected card begins at x = 57.92 px; document size is exactly 390 × 844; the action dock ends at y = 830 inside the 844 px viewport. On desktop the document is exactly 1192 × 368 and the action dock ends at y = 354.
3. Final comparison — passed.
   - No actionable P0, P1, or P2 findings remain.
   - P3 follow-up: a future polish pass could make horizontal swiping more explicit when a hand exceeds the available width.

## Interaction and Runtime Checks

- Tested: sort by suit, sort by rank, choose claim, select card, play face down, Check the most recent play, and pass.
- Tested viewports: 1192 × 368 and 390 × 844.
- Browser console and page errors: none.
- Persistent controls: visible and inside both viewports.

## Implementation Checklist

- [x] Preserve the reference's useful information hierarchy without copying its visual language.
- [x] Keep every hand card visible or reachable and make selected cards lift visibly.
- [x] Support point/rank and suit sorting.
- [x] Keep pile count and all three turn actions visible.
- [x] Pass desktop and phone overflow checks.
- [x] Exercise the complete primary interaction loop.

final result: passed
