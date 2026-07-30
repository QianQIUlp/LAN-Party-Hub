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

The site header's compact, centered four-color mark is the canonical LAN Party Hub icon. The following browser and install icons reproduce its proportions and color order. They are generated deterministically by `npm run icons:generate --workspace @open-party-lab/site`; no external images, fonts, logos, or generated-media service are used.

| File | Size | SHA-256 |
| --- | ---: | --- |
| `public/favicon.png` | 64×64 | `292659a3086f98bbe34c66e5d155329f7edf3e9c8deb4f1ddf1b02320b7eceaf` |
| `public/apple-touch-icon.png` | 180×180 | `4abed94ef7799e17bad41945e0b34a9917651642a11e8859f8588cc1c5ff1eea` |
| `public/icon-192.png` | 192×192 | `242dd819b86d7b58129647d0cc674793cb4003bf1357828bc8ae8e6ea2ed91b3` |
| `public/icon-512.png` | 512×512 | `40841d998210d14dfd6b839ede34ffdb7d527150d14b2964e0d7eb95cdba7531` |

The repository Git history and `scripts/generate-icons.mjs` are the provenance record for these original project assets.
The same generator emits the Host, Controller, Windows executable, and tray assets documented in `../../assets/branding/README.md`.
