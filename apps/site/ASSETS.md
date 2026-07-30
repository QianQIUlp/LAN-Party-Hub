# Site Asset Provenance

## `public/og.png`

- Purpose: Open Graph and social-link preview for the LAN Party Hub project introduction site.
- Created: 2026-07-29 with the OpenAI built-in image generation tool.
- Input images: none.
- Post-processing: none; the generated RGB PNG was copied into the repository unchanged.
- SHA-256: `a4a9832fed73a1cf0863918fb9224b89ec95a8dce6264eedcfcd8b747555d5af`
- Rights/source statement: generated specifically for LAN Party Hub without third-party source images, logos, or trademarks. The repository Git history is the provenance record for this asset.

Final prompt:

```text
Use case: ads-marketing
Asset type: 1200×630 landscape Open Graph social card for the finished LAN Party Hub project introduction website
Primary request: Create a polished social preview card for an open-source, local-first browser party game hub where one Windows computer is the shared screen and friends use phones as controllers over local Wi-Fi.
Scene/backdrop: deep navy-black technical grid with subtle room-like depth, no people.
Subject: on the right, one modern shared monitor showing a colorful party-game lobby, connected by restrained glowing cyan Wi-Fi signal lines to two distinct phone controllers in the foreground; the screen and phones should look like abstract product UI, not screenshots.
Style/medium: crisp editorial technology illustration, premium retro-arcade energy, geometric shapes, clean high-contrast finish, not photorealistic and not concept art.
Composition/framing: true wide 1.91:1 social-card composition; left half reserved for large typography, visual device cluster on the right; generous safe margins so nothing is cropped in link previews.
Lighting/mood: inviting, energetic, trustworthy, local game-night atmosphere.
Color palette: #07111f deep navy, #19d3c5 cyan, #51f4e7 bright mint, with small accents of #ffc24a amber, #ff5d7d coral, and #a982ff violet.
Text (verbatim): “LAN PARTY HUB” and “ONE COMPUTER. EVERY PHONE IS A CONTROLLER.”
Typography: render exactly those two text elements and no others; bold clean geometric sans-serif; “LAN PARTY HUB” small uppercase at the top left, headline large and stacked below; preserve spelling and punctuation exactly.
Constraints: the full artwork must fill the card edge to edge; keep all text highly legible at thumbnail size; no QR code, no tiny interface text, no extra words, no unrelated logos, no trademarks, no watermark, no signatures.
```

## Browser and install icons

The following icons reproduce the four-color CSS brand mark already used in the site header. They are generated deterministically by `npm run icons:generate --workspace @open-party-lab/site`; no external images, fonts, logos, or generated-media service are used.

| File | Size | SHA-256 |
| --- | ---: | --- |
| `public/favicon.png` | 64×64 | `26e5d9e7702f25d83d6263eae159277b28e33ed08e8c8a879320cf66abab0809` |
| `public/apple-touch-icon.png` | 180×180 | `5431fb2a7d4feb67dcab335e7d7b2f0f89db0ba81d8df9c075bf1d76fd4536a7` |
| `public/icon-192.png` | 192×192 | `496233d630684874e6d415a79c5fe0d619682602ff703938d05a9b9c1bba2243` |
| `public/icon-512.png` | 512×512 | `ae72ac93550bd19541ac091f96a2b27b55e84ab835754a16cbc381c73b565318` |

The repository Git history and `scripts/generate-icons.mjs` are the provenance record for these original project assets.
