/**
 * Texture key constants and asset path mapping for Auction King.
 *
 * Images are optional. The renderer always falls back to Phaser graphics
 * primitives when a texture is not loaded. To enable images, place the
 * generated PNGs in a directory served at `/auction-king/images/` on the
 * host dev server (e.g. `apps/host/public/auction-king/images/`).
 */

export const TEXTURE_KEYS = {
  bgAuctionHall: "ak_bg_hall",
  bgScoreboard: "ak_bg_scoreboard",
  catAntique: "ak_cat_antique",
  catJewelry: "ak_cat_jewelry",
  catArtwork: "ak_cat_artwork",
  catCurio: "ak_cat_curio",
  iconGavel: "ak_icon_gavel",
  iconGold: "ak_icon_gold",
  frameLegendary: "ak_frame_legendary",
  frameEpic: "ak_frame_epic",
  frameRare: "ak_frame_rare",
  frameCommon: "ak_frame_common"
} as const;

type TextureKey = (typeof TEXTURE_KEYS)[keyof typeof TEXTURE_KEYS];

const ASSET_PATHS: Record<TextureKey, string> = {
  [TEXTURE_KEYS.bgAuctionHall]: "/auction-king/images/bg-auction-hall.png",
  [TEXTURE_KEYS.bgScoreboard]: "/auction-king/images/bg-scoreboard.png",
  [TEXTURE_KEYS.catAntique]: "/auction-king/images/cat-antique.png",
  [TEXTURE_KEYS.catJewelry]: "/auction-king/images/cat-jewelry.png",
  [TEXTURE_KEYS.catArtwork]: "/auction-king/images/cat-artwork.png",
  [TEXTURE_KEYS.catCurio]: "/auction-king/images/cat-curio.png",
  [TEXTURE_KEYS.iconGavel]: "/auction-king/images/icon-gavel.png",
  [TEXTURE_KEYS.iconGold]: "/auction-king/images/icon-gold.png",
  [TEXTURE_KEYS.frameLegendary]: "/auction-king/images/frame-legendary.png",
  [TEXTURE_KEYS.frameEpic]: "/auction-king/images/frame-epic.png",
  [TEXTURE_KEYS.frameRare]: "/auction-king/images/frame-rare.png",
  [TEXTURE_KEYS.frameCommon]: "/auction-king/images/frame-common.png"
};

/** Category → texture key mapping */
const CATEGORY_TEXTURES: Record<string, TextureKey> = {
  "古董": TEXTURE_KEYS.catAntique,
  "珠宝": TEXTURE_KEYS.catJewelry,
  "艺术品": TEXTURE_KEYS.catArtwork,
  "奇物": TEXTURE_KEYS.catCurio
};

/** Rarity → frame texture key mapping */
const RARITY_FRAME_TEXTURES: Record<string, TextureKey> = {
  legendary: TEXTURE_KEYS.frameLegendary,
  epic: TEXTURE_KEYS.frameEpic,
  rare: TEXTURE_KEYS.frameRare,
  common: TEXTURE_KEYS.frameCommon
};

/**
 * Attempt to load all known image assets. Safe to call in preload().
 * If a file is missing, Phaser logs a warning and the texture key simply
 * won't exist — the renderer checks `scene.textures.exists()` before use.
 */
export function preloadAuctionKingAssets(scene: Phaser.Scene): void {
  for (const [key, path] of Object.entries(ASSET_PATHS)) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, path);
    }
  }
}

/** Check whether a texture has been loaded. */
export function hasTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

/** Get the category illustration texture key for a given category name. */
export function getCategoryTexture(category: string): TextureKey | undefined {
  return CATEGORY_TEXTURES[category];
}

/** Get the rarity frame texture key for a given rarity. */
export function getRarityFrameTexture(rarity: string): TextureKey | undefined {
  return RARITY_FRAME_TEXTURES[rarity];
}
