import type { SupportedLanguage } from "@open-party-lab/game-core";
import type {
  AuctionCandidateView,
  AuctionCatalogItem,
  AuctionWarehouse,
  ItemKnowledge,
  PlayerKnowledge,
  VisibleWarehouseItem,
  WarehouseItem
} from "../protocol.js";
import { auctionCatalog, localize } from "./content.js";

export type RandomSource = () => number;

const warehouseRarities = [
  "white", "white", "white",
  "green", "green", "green",
  "blue", "blue",
  "purple", "purple",
  "gold",
  "red"
] as const;

function shuffle<T>(values: T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function chooseCatalogItems(random: RandomSource): AuctionCatalogItem[] {
  const used = new Set<string>();
  const selected: AuctionCatalogItem[] = [];

  for (const rarity of warehouseRarities) {
    const candidates = auctionCatalog.filter((entry) => entry.rarity === rarity && !used.has(entry.id));
    const weighted = candidates.flatMap((entry) => Array.from({ length: Math.max(1, entry.spawnWeight) }, () => entry));
    const choice = weighted[Math.floor(random() * weighted.length)] ?? candidates[0];
    if (!choice) continue;
    used.add(choice.id);
    selected.push(choice);
  }

  const maxOccupiedCells = 60;
  const selectedIds = new Set(selected.map((entry) => entry.id));
  const area = (entry: AuctionCatalogItem) => entry.width * entry.height;

  while (selected.reduce((sum, entry) => sum + area(entry), 0) > maxOccupiedCells) {
    const replacements = selected.flatMap((current, index) =>
      auctionCatalog
        .filter((candidate) =>
          candidate.rarity === current.rarity &&
          !selectedIds.has(candidate.id) &&
          area(candidate) < area(current)
        )
        .map((candidate) => ({
          index,
          current,
          candidate,
          savedCells: area(current) - area(candidate)
        }))
    ).sort((left, right) => right.savedCells - left.savedCells);
    const replacement = replacements[0];
    if (!replacement) break;
    selectedIds.delete(replacement.current.id);
    selectedIds.add(replacement.candidate.id);
    selected[replacement.index] = replacement.candidate;
  }

  return selected.sort((left, right) => area(right) - area(left));
}

function canPlace(
  occupied: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (y + height > occupied.length || x + width > (occupied[0]?.length ?? 0)) return false;
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (occupied[row][col]) return false;
    }
  }
  return true;
}

function markPlaced(occupied: boolean[][], x: number, y: number, width: number, height: number): void {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      occupied[row][col] = true;
    }
  }
}

function placeCatalogItems(
  catalogItems: AuctionCatalogItem[],
  random: RandomSource,
  cols: number,
  rows: number
): WarehouseItem[] {
  const occupied = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const items: WarehouseItem[] = [];

  for (const [index, catalogItem] of catalogItems.entries()) {
    let placed: WarehouseItem | null = null;
    const orientationOrder = random() < 0.5 ? [false, true] : [true, false];

    for (const rotated of orientationOrder) {
      const width = rotated ? catalogItem.height : catalogItem.width;
      const height = rotated ? catalogItem.width : catalogItem.height;
      const positions = shuffle(
        Array.from({ length: rows * cols }, (_, position) => ({
          x: position % cols,
          y: Math.floor(position / cols)
        })),
        random
      );

      const position = positions.find(({ x, y }) => canPlace(occupied, x, y, width, height));
      if (!position) continue;

      placed = {
        instanceId: `warehouse-${index + 1}-${catalogItem.id}`,
        catalogId: catalogItem.id,
        category: catalogItem.category,
        rarity: catalogItem.rarity,
        trueValue: catalogItem.value,
        x: position.x,
        y: position.y,
        width,
        height,
        rotated
      };
      markPlaced(occupied, position.x, position.y, width, height);
      break;
    }

    if (placed) items.push(placed);
  }

  return items;
}

export function generateWarehouse(random: RandomSource = Math.random): AuctionWarehouse {
  const cols = 10;
  const rows = 8;
  const catalogItems = chooseCatalogItems(random);
  let items: WarehouseItem[] = [];

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = placeCatalogItems(catalogItems, random, cols, rows);
    if (candidate.length > items.length) items = candidate;
    if (candidate.length === catalogItems.length) {
      items = candidate;
      break;
    }
  }

  return {
    cols,
    rows,
    items,
    totalValue: items.reduce((sum, item) => sum + item.trueValue, 0),
    occupiedCells: items.reduce((sum, item) => sum + item.width * item.height, 0)
  };
}

export function createEmptyKnowledge(): PlayerKnowledge {
  return {
    items: {},
    notes: [],
    estimatedWarehouseMin: null,
    estimatedWarehouseMax: null
  };
}

export function cloneKnowledge(knowledge: PlayerKnowledge): PlayerKnowledge {
  return {
    items: Object.fromEntries(
      Object.entries(knowledge.items).map(([id, value]) => [id, { ...value }])
    ),
    notes: knowledge.notes.map((entry) => ({ ...entry })),
    estimatedWarehouseMin: knowledge.estimatedWarehouseMin,
    estimatedWarehouseMax: knowledge.estimatedWarehouseMax
  };
}

export function ensureItemKnowledge(knowledge: PlayerKnowledge, instanceId: string): ItemKnowledge {
  const existing = knowledge.items[instanceId];
  if (existing) return existing;
  const created: ItemKnowledge = {
    outlineKnown: false,
    rarityKnown: false,
    categoryKnown: false,
    identityKnown: false
  };
  knowledge.items[instanceId] = created;
  return created;
}

export function revealOutline(knowledge: PlayerKnowledge, item: WarehouseItem): void {
  ensureItemKnowledge(knowledge, item.instanceId).outlineKnown = true;
}

export function revealRarity(knowledge: PlayerKnowledge, item: WarehouseItem): void {
  ensureItemKnowledge(knowledge, item.instanceId).rarityKnown = true;
}

export function revealCategory(knowledge: PlayerKnowledge, item: WarehouseItem): void {
  ensureItemKnowledge(knowledge, item.instanceId).categoryKnown = true;
}

export function revealIdentity(knowledge: PlayerKnowledge, item: WarehouseItem): void {
  const entry = ensureItemKnowledge(knowledge, item.instanceId);
  entry.outlineKnown = true;
  entry.rarityKnown = true;
  entry.categoryKnown = true;
  entry.identityKnown = true;
}

export function mergeKnowledge(publicKnowledge: PlayerKnowledge, privateKnowledge: PlayerKnowledge): PlayerKnowledge {
  const merged = cloneKnowledge(publicKnowledge);
  for (const [instanceId, privateEntry] of Object.entries(privateKnowledge.items)) {
    const entry = ensureItemKnowledge(merged, instanceId);
    entry.outlineKnown ||= privateEntry.outlineKnown;
    entry.rarityKnown ||= privateEntry.rarityKnown;
    entry.categoryKnown ||= privateEntry.categoryKnown;
    entry.identityKnown ||= privateEntry.identityKnown;
  }
  merged.notes = [...publicKnowledge.notes, ...privateKnowledge.notes].sort(
    (left, right) => left.round - right.round || left.id.localeCompare(right.id)
  );
  merged.estimatedWarehouseMin = privateKnowledge.estimatedWarehouseMin ?? publicKnowledge.estimatedWarehouseMin;
  merged.estimatedWarehouseMax = privateKnowledge.estimatedWarehouseMax ?? publicKnowledge.estimatedWarehouseMax;
  return merged;
}

export function visibleWarehouseItems(
  warehouse: AuctionWarehouse,
  knowledge: PlayerKnowledge,
  language: SupportedLanguage,
  revealAll = false
): VisibleWarehouseItem[] {
  return warehouse.items.flatMap((item) => {
    const known = knowledge.items[item.instanceId];
    if (!revealAll && !known) return [];
    const catalog = auctionCatalog.find((entry) => entry.id === item.catalogId);
    const outlineKnown = revealAll || Boolean(known?.outlineKnown);
    const rarityKnown = revealAll || Boolean(known?.rarityKnown);
    const categoryKnown = revealAll || Boolean(known?.categoryKnown);
    const identityKnown = revealAll || Boolean(known?.identityKnown);

    return [{
      instanceId: item.instanceId,
      anchorX: item.x,
      anchorY: item.y,
      x: outlineKnown ? item.x : null,
      y: outlineKnown ? item.y : null,
      width: outlineKnown ? item.width : null,
      height: outlineKnown ? item.height : null,
      outlineKnown,
      rarityKnown,
      categoryKnown,
      identityKnown,
      rarity: rarityKnown ? item.rarity : null,
      category: categoryKnown ? item.category : null,
      catalogId: identityKnown ? item.catalogId : null,
      name: identityKnown && catalog ? localize(catalog.name, language) : null,
      imagePath: identityKnown ? catalog?.imagePath : undefined,
      trueValue: revealAll ? item.trueValue : null
    }];
  });
}

function matchesFootprint(candidate: AuctionCatalogItem, item: WarehouseItem): boolean {
  return (
    (candidate.width === item.width && candidate.height === item.height) ||
    (candidate.width === item.height && candidate.height === item.width)
  );
}

export function buildCandidates(
  warehouse: AuctionWarehouse,
  knowledge: PlayerKnowledge,
  language: SupportedLanguage
): Record<string, AuctionCandidateView[]> {
  const reasonText = language === "zh-CN"
    ? { outline: (width: number, height: number) => `轮廓匹配 ${width}×${height}`, rarity: "品质匹配", category: "类型匹配" }
    : language === "de"
    ? { outline: (width: number, height: number) => `Umriss ${width}×${height}`, rarity: "Seltenheit passt", category: "Kategorie passt" }
    : { outline: (width: number, height: number) => `Footprint ${width}×${height}`, rarity: "Rarity matches", category: "Category matches" };
  const identifiedCatalogIds = new Set(
    Object.entries(knowledge.items)
      .filter(([, entry]) => entry.identityKnown)
      .map(([instanceId]) => warehouse.items.find((item) => item.instanceId === instanceId)?.catalogId)
      .filter((id): id is string => Boolean(id))
  );

  return Object.fromEntries(
    warehouse.items.flatMap((item) => {
      const known = knowledge.items[item.instanceId];
      if (!known) return [];

      let candidates = auctionCatalog.filter((candidate) => {
        if (known.identityKnown) return candidate.id === item.catalogId;
        if (identifiedCatalogIds.has(candidate.id)) return false;
        if (known.outlineKnown && !matchesFootprint(candidate, item)) return false;
        if (known.rarityKnown && candidate.rarity !== item.rarity) return false;
        if (known.categoryKnown && candidate.category !== item.category) return false;
        return true;
      });

      if (candidates.length === 0) candidates = auctionCatalog.filter((candidate) => candidate.id === item.catalogId);
      const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.spawnWeight, 0) || 1;
      const views = candidates
        .map((candidate) => {
          const probability = candidate.spawnWeight / totalWeight;
          const reasons: string[] = [];
          if (known.outlineKnown) reasons.push(reasonText.outline(item.width, item.height));
          if (known.rarityKnown) reasons.push(reasonText.rarity);
          if (known.categoryKnown) reasons.push(reasonText.category);
          return {
            catalogId: candidate.id,
            name: localize(candidate.name, language),
            category: candidate.category,
            rarity: candidate.rarity,
            width: candidate.width,
            height: candidate.height,
            value: candidate.value,
            imagePath: candidate.imagePath,
            probability,
            confidence: candidates.length === 1 ? "certain" : probability >= 0.35 ? "likely" : "possible",
            reasons
          } satisfies AuctionCandidateView;
        })
        .sort((left, right) => right.probability - left.probability || right.value - left.value);

      return [[item.instanceId, views]];
    })
  );
}

export function randomItems(
  warehouse: AuctionWarehouse,
  count: number,
  random: RandomSource,
  predicate: (item: WarehouseItem) => boolean = () => true
): WarehouseItem[] {
  return shuffle(warehouse.items.filter(predicate), random).slice(0, Math.max(0, count));
}
