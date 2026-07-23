import type { BullshitCard, BullshitRank, BullshitSuit } from "../protocol.js";
import { bullshitRanks, bullshitSuits } from "../protocol.js";

const rankOrder = new Map<BullshitRank, number>(
  bullshitRanks.map((rank, index) => [rank, index])
);
const suitOrder = new Map<BullshitSuit, number>(
  bullshitSuits.map((suit, index) => [suit, index])
);

export function createStandardDeck(): BullshitCard[] {
  return bullshitSuits.flatMap((suit) =>
    bullshitRanks.map((rank) => ({
      id: `${suit}-${rank}`,
      rank,
      suit
    }))
  );
}

export function sortCards(cards: readonly BullshitCard[]): BullshitCard[] {
  return [...cards].sort((left, right) => {
    const rankDifference = (rankOrder.get(left.rank) ?? 0) - (rankOrder.get(right.rank) ?? 0);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return (suitOrder.get(left.suit) ?? 0) - (suitOrder.get(right.suit) ?? 0);
  });
}

export function isBullshitRank(value: unknown): value is BullshitRank {
  return typeof value === "string" && (bullshitRanks as readonly string[]).includes(value);
}

export function isTruthfulBatch(cards: readonly BullshitCard[], claimedRank: BullshitRank): boolean {
  return cards.length > 0 && cards.every((card) => card.rank === claimedRank);
}
