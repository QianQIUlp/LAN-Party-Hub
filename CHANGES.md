# Changes from Open Party Lab

LAN Party Hub is an independently maintained derivative of Open Party Lab. This file is the high-level modification record required by the project's attribution policy; Git history remains the detailed record.

## 2026 first playable version

- Renamed the user-facing product to LAN Party Hub / 局域网派对中心 while retaining compatible internal package names.
- Bundled four imported games at fixed upstream revisions so source and Windows releases are reproducible and do not clone game repositories during a build.
- Added the LAN Party Hub-original `bullshit` card game with authoritative private hands, last-play-only checks, one pass per active pile, pending validation of a player's final play, and an original responsive pixel-art card-table controller with centered pile, card-flight, and full-screen Check motion.
- Added Simplified Chinese as the complete default experience and added original or locally maintained Chinese game content.
- Added authoritative input validation, bound game actions to authenticated controller identities, and corrected private-state handling, including keeping the Imposter secret away from the imposter player.
- Added versioned room persistence, reconnect recovery, LAN diagnostics, selectable join addresses, graceful shutdown, and a portable Windows launcher.
- Added unit, Socket.IO integration, Playwright offline-flow, and Windows release smoke tests.
- Added repository ownership, worktree, shared-interface, pull-request, and legal-notice rules for parallel human and AI-agent development.

## File-level modification notices

Files derived from upstream and changed by LAN Party Hub use this notice when their syntax permits comments:

```text
Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
```

Formats that cannot safely contain comments, generated lockfiles, and externally imported game files are tracked in [config/upstream-modified-files.json](config/upstream-modified-files.json). Run `npm run legal:check` before committing and use `npm run legal:mark -- --base <base-ref>` when an existing upstream-derived text file is changed for the first time.
