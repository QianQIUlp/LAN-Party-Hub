# Auction King original visual assets

All production images under `games/auction-king/public/shared/auction-king/images/` were generated specifically for LAN Party Hub on 2026-07-28 with OpenAI's built-in ImageGen tool. No reference images, third-party characters, logos, screenshots, or other source artwork were supplied to the generator.

The common art direction is an original dark warehouse-auction setting using charcoal steel, aged brass, dark wood, muted teal light, and rarity-color accents. The generated set contains:

- one 16:9 warehouse-auction environment background;
- six original adult specialist portraits;
- six original appraisal-instrument props;
- twenty-four original collectible props matching the IDs in `src/server/content.ts`.

Each image was generated independently rather than cropped from a contact sheet. Source generations were resized for runtime delivery with `pngjs`: background `1280×720`, portraits `384×384`, instruments `256×256`, and collectibles `320×320`. The checked-in PNG files are the production assets, not build output.

## Prompt provenance

The background prompt requested an original cinematic secret appraisal warehouse with a central brass-and-smoked-glass podium, dark overlay-safe negative space, no characters, UI, text, logos, or franchise motifs.

Character prompts individually described the Spectrum Cartographer, Apex Hunter, Fog Classifier, Echo Archivist, Spatial Engineer, and Value Auditor as original semi-realistic 3D specialists. Instrument and collectible prompts individually named the relevant original prop and required one isolated museum-catalog object, a clear small-size silhouette, a charcoal studio backdrop, and no text, logos, watermarks, or recognizable franchise design.

These repository-original generated assets are distributed with Auction King under the repository's Apache-2.0 license.
