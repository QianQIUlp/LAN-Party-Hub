import Phaser from "phaser";
import { auctionCatalog, auctionInstruments } from "../server/content.js";

export const backgroundTextureKey = "auction-warehouse-background";

export function itemTextureKey(catalogId: string): string {
  return `auction-item-${catalogId}`;
}

export function instrumentTextureKey(instrumentId: string): string {
  return `auction-instrument-${instrumentId}`;
}

export function preloadAuctionKingAssets(scene: Phaser.Scene): void {
  scene.load.image(backgroundTextureKey, "/auction-king/images/warehouse-background.png");
  for (const item of auctionCatalog) {
    if (item.imagePath) scene.load.image(itemTextureKey(item.id), item.imagePath);
  }
  for (const instrument of auctionInstruments) {
    if (instrument.iconPath) scene.load.image(instrumentTextureKey(instrument.id), instrument.iconPath);
  }
}

export function hasTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key) && key !== "__MISSING";
}
