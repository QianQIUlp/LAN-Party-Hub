import { useMemo, useState, type CSSProperties } from "react";
import { ReadyPanel } from "../common/ReadyPanel.js";
import type { CardHandCardModel, CardHandLayoutModel, CardHandSuit } from "./models.js";
import "./CardHandLayout.css";

interface CardHandLayoutProps {
  model: CardHandLayoutModel;
}

type SortMode = "rank" | "suit";

const rankOrder = new Map(
  ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].map((rank, index) => [rank, index])
);

const suitOrder: Record<CardHandSuit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3
};

const suitSymbols: Record<CardHandSuit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

function compareCards(a: CardHandCardModel, b: CardHandCardModel, mode: SortMode): number {
  const rankDifference = (rankOrder.get(a.rank) ?? 99) - (rankOrder.get(b.rank) ?? 99);
  const suitDifference = suitOrder[a.suit] - suitOrder[b.suit];
  return mode === "rank" ? rankDifference || suitDifference : suitDifference || rankDifference;
}

function fanStyle(index: number, count: number, selected: boolean): CSSProperties {
  const center = (count - 1) / 2;
  const distance = count <= 1 ? 0 : (index - center) / Math.max(center, 1);
  const left = count <= 1 ? 50 : 5 + (index / (count - 1)) * 90;
  const mobileLeft = count <= 1 ? 50 : 11 + (index / (count - 1)) * 78;
  const curve = Math.pow(Math.abs(distance), 1.6) * 18;
  const angle = distance * Math.min(11, 4 + count * 0.45);

  return {
    "--card-left": `${left}%`,
    "--card-left-mobile": `${mobileLeft}%`,
    zIndex: selected ? 100 + index : 10 + index,
    "--card-angle": `${angle}deg`,
    "--card-curve": `${curve}px`,
    "--card-lift": selected ? "-24px" : "0px"
  } as CSSProperties;
}

export function CardHandLayout({ model }: CardHandLayoutProps) {
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const sortedCards = useMemo(
    () => [...model.cards].sort((a, b) => compareCards(a, b, sortMode)),
    [model.cards, sortMode]
  );
  const boardStyle = {
    "--card-table-texture": `url("${model.tableTextureUrl}")`
  } as CSSProperties;

  return (
    <div className="card-hand-board" style={boardStyle}>
      {model.ready ? (
        <div className="card-hand-ready">
          <ReadyPanel ready={model.ready} />
        </div>
      ) : null}

      <header className="card-hand-header">
        <div className="card-hand-title-group">
          <span className="card-hand-kicker">FACE DOWN · SPEAK UP</span>
          <h1>{model.title}</h1>
          {model.subtitle ? (
            <span className={`card-hand-turn ${model.isCurrentTurn ? "is-active" : ""}`}>{model.subtitle}</span>
          ) : null}
        </div>

        <dl className="card-hand-stats" aria-label={model.handLabel}>
          <div>
            <dt>{model.handLabel}</dt>
            <dd>{model.cards.length}</dd>
          </div>
          <div>
            <dt>{model.selectedLabel}</dt>
            <dd>{model.selectedCount}</dd>
          </div>
          <div>
            <dt>{model.pileLabel}</dt>
            <dd>{model.pileCount}</dd>
          </div>
        </dl>
      </header>

      <div className="card-hand-message" role="status" aria-live="polite">
        {model.helperText}
      </div>

      <section className="card-hand-claim-panel" aria-label={model.claimLabel}>
        <div className="card-hand-claim-heading">
          <span>{model.claimLabel}</span>
          <strong>{model.activeRank ?? "?"}</strong>
        </div>
        {model.activeRank ? (
          <div className="card-hand-rank-locked">{model.activeRank}</div>
        ) : (
          <div className="card-hand-rank-rail">
            {model.rankOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.selected}
                aria-label={option.label}
                className={option.selected ? "is-selected" : ""}
                disabled={model.disabled || option.disabled}
                onClick={option.onSelect}
              >
                {option.rank}
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="card-hand-playfield">
        <section className="card-hand-hand-zone" aria-label={model.handLabel}>
          <div className="card-hand-sort-row">
            <span>{model.sortLabel}</span>
            <div>
              <button
                type="button"
                aria-pressed={sortMode === "rank"}
                className={sortMode === "rank" ? "is-selected" : ""}
                onClick={() => setSortMode("rank")}
              >
                {model.rankSortLabel}
              </button>
              <button
                type="button"
                aria-pressed={sortMode === "suit"}
                className={sortMode === "suit" ? "is-selected" : ""}
                onClick={() => setSortMode("suit")}
              >
                {model.suitSortLabel}
              </button>
            </div>
          </div>

          <div className="card-hand-fan-scroll">
            <div
              className="card-hand-fan"
              data-card-count={sortedCards.length}
              style={{ minWidth: `${Math.max(280, sortedCards.length * 32)}px` }}
            >
              {sortedCards.map((card, index) => {
                const symbol = suitSymbols[card.suit];
                const red = card.suit === "diamonds" || card.suit === "hearts";
                return (
                  <div
                    key={card.id}
                    className={`card-hand-card ${red ? "is-red" : "is-black"} ${card.selected ? "is-selected" : ""} ${hoveredCardId === card.id ? "is-hovered" : ""}`}
                    style={fanStyle(index, sortedCards.length, card.selected)}
                    aria-hidden="true"
                  >
                    <span className="card-hand-card-corner">
                      <strong>{card.rank}</strong>
                      <span aria-hidden="true">{symbol}</span>
                    </span>
                    <span className="card-hand-card-center" aria-hidden="true">
                      <strong>{card.rank}</strong>
                      <span>{symbol}</span>
                    </span>
                  </div>
                );
              })}
              <div className="card-hand-hit-map">
                {sortedCards.map((card, index) => {
                  const left = sortedCards.length <= 1 ? 50 : 5 + (index / (sortedCards.length - 1)) * 90;
                  const width = sortedCards.length <= 1 ? 100 : 90 / (sortedCards.length - 1);
                  const mobileLeft = sortedCards.length <= 1 ? 50 : 11 + (index / (sortedCards.length - 1)) * 78;
                  const mobileWidth = sortedCards.length <= 1 ? 100 : 78 / (sortedCards.length - 1);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className="card-hand-card-hit"
                      style={{
                        "--card-hit-left": `${left}%`,
                        "--card-hit-left-mobile": `${mobileLeft}%`,
                        "--card-hit-width": `${width}%`,
                        "--card-hit-width-mobile": `${mobileWidth}%`
                      } as CSSProperties}
                      aria-label={card.accessibilityLabel}
                      aria-pressed={card.selected}
                      disabled={model.disabled || card.disabled}
                      onPointerEnter={() => setHoveredCardId(card.id)}
                      onPointerLeave={() => setHoveredCardId((current) => current === card.id ? null : current)}
                      onFocus={() => setHoveredCardId(card.id)}
                      onBlur={() => setHoveredCardId((current) => current === card.id ? null : current)}
                      onClick={card.onToggle}
                    >
                      <span className="card-hand-sr-only">{card.helperText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="card-hand-pile-zone" aria-label={model.pileLabel}>
          <div className="card-hand-pile-stack" aria-hidden="true">
            <img src={model.cardBackUrl} alt="" />
            <img src={model.cardBackUrl} alt="" />
            <img src={model.cardBackUrl} alt="" />
          </div>
          <div className="card-hand-pile-count">
            <strong>{model.pileCount}</strong>
            <span>{model.pileLabel}</span>
          </div>
          {model.lastPlayLabel ? <small>{model.lastPlayLabel}</small> : null}
        </aside>
      </main>

      <footer className="card-hand-actions">
        <button
          type="button"
          className="card-hand-action is-check"
          disabled={model.disabled || !model.canCheck}
          onClick={model.onCheck}
        >
          {model.checkLabel}
        </button>
        <button
          type="button"
          className="card-hand-action is-play"
          disabled={model.disabled || !model.canPlay}
          onClick={model.onPlay}
        >
          {model.playLabel}
        </button>
        <button
          type="button"
          className="card-hand-action is-pass"
          disabled={model.disabled || !model.canPass}
          onClick={model.onPass}
        >
          {model.passLabel}
        </button>
      </footer>
    </div>
  );
}
