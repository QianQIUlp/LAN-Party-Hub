import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ReadyPanel } from "../common/ReadyPanel.js";
import type { CardHandCardModel, CardHandLayoutModel, CardHandSuit } from "./models.js";
import "./CardHandLayout.css";

interface CardHandLayoutProps {
  model: CardHandLayoutModel;
}

interface FlightCard {
  id: string;
  rank: string;
  suit: CardHandSuit;
  startX: number;
  startY: number;
  width: number;
  height: number;
  deltaX: number;
  deltaY: number;
  delayMs: number;
  spin: number;
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
    "--card-angle": `${angle}deg`,
    "--card-curve": `${curve}px`,
    "--card-lift": selected ? "-24px" : "0px",
    "--card-deal-delay": `${Math.min(index, 16) * 22}ms`,
    zIndex: selected ? 100 + index : 10 + index
  } as CSSProperties;
}

function pileCardStyle(index: number, count: number): CSSProperties {
  const center = (count - 1) / 2;
  const distance = index - center;
  return {
    "--pile-card-x": `${distance * 9}px`,
    "--pile-card-y": `${Math.abs(distance) * 2 + index * 1.5}px`,
    "--pile-card-rotation": `${distance * 4.5 + (index % 2 === 0 ? -1.5 : 1.5)}deg`,
    "--pile-card-delay": `${index * 55}ms`,
    zIndex: 20 + index
  } as CSSProperties;
}

function reducedMotionPreferred(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function CardHandLayout({ model }: CardHandLayoutProps) {
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [flightCards, setFlightCards] = useState<FlightCard[]>([]);
  const [isPlayingCards, setIsPlayingCards] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pileTargetRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const timersRef = useRef<number[]>([]);
  const sortedCards = useMemo(
    () => [...model.cards].sort((a, b) => compareCards(a, b, sortMode)),
    [model.cards, sortMode]
  );
  const visiblePileCount = Math.min(model.pileCount, 5);
  const boardStyle = {
    "--card-table-texture": `url("${model.tableTextureUrl}")`,
    "--check-impact-texture": `url("${model.checkImpactUrl}")`
  } as CSSProperties;

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  function schedule(callback: () => void, delayMs: number): void {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((entry) => entry !== timer);
      callback();
    }, delayMs);
    timersRef.current.push(timer);
  }

  function handlePlay(): void {
    if (!model.canPlay || isPlayingCards || isChecking) {
      return;
    }

    const selectedCards = sortedCards.filter((card) => card.selected);
    if (selectedCards.length === 0 || reducedMotionPreferred()) {
      model.onPlay();
      return;
    }

    const boardRect = boardRef.current?.getBoundingClientRect();
    const pileRect = pileTargetRef.current?.getBoundingClientRect();
    if (!boardRect || !pileRect) {
      model.onPlay();
      return;
    }

    const flights = selectedCards.flatMap((card, index) => {
      const cardRect = cardRefs.current.get(card.id)?.getBoundingClientRect();
      if (!cardRect) {
        return [];
      }

      const startX = cardRect.left - boardRect.left;
      const startY = cardRect.top - boardRect.top;
      const targetX = pileRect.left - boardRect.left + pileRect.width / 2 - cardRect.width / 2;
      const targetY = pileRect.top - boardRect.top + pileRect.height / 2 - cardRect.height / 2;
      const landingOffset = (index - (selectedCards.length - 1) / 2) * 4;

      return [{
        id: card.id,
        rank: card.rank,
        suit: card.suit,
        startX,
        startY,
        width: cardRect.width,
        height: cardRect.height,
        deltaX: targetX - startX + landingOffset,
        deltaY: targetY - startY + Math.abs(landingOffset) * 0.35,
        delayMs: Math.min(index, 4) * 70,
        spin: (index % 2 === 0 ? -1 : 1) * (5 + index * 2)
      }];
    });

    if (flights.length === 0) {
      model.onPlay();
      return;
    }

    setHoveredCardId(null);
    setFlightCards(flights);
    setIsPlayingCards(true);
    vibrate(35);
    schedule(model.onPlay, 430 + Math.min(flights.length - 1, 4) * 70);
    schedule(() => {
      setFlightCards([]);
      setIsPlayingCards(false);
    }, 980);
  }

  function handleCheck(): void {
    if (!model.canCheck || isChecking || isPlayingCards) {
      return;
    }

    if (reducedMotionPreferred()) {
      model.onCheck();
      return;
    }

    setIsChecking(true);
    vibrate([70, 35, 130, 35, 90]);
    schedule(model.onCheck, 420);
    schedule(() => setIsChecking(false), 1_320);
  }

  function handlePass(): void {
    if (!model.canPass || isChecking || isPlayingCards) {
      return;
    }
    vibrate(18);
    model.onPass();
  }

  return (
    <div
      ref={boardRef}
      className={`card-hand-board ${isPlayingCards ? "is-playing-cards" : ""} ${isChecking ? "is-checking" : ""}`}
      style={boardStyle}
    >
      {model.ready ? (
        <div className="card-hand-ready">
          <ReadyPanel ready={model.ready} />
        </div>
      ) : null}

      <header className="card-hand-header">
        <div className="card-hand-title-group">
          <h1>{model.title}</h1>
          {model.subtitle ? (
            <span className={`card-hand-turn ${model.isCurrentTurn ? "is-active" : ""}`}>{model.subtitle}</span>
          ) : null}
        </div>

        <dl className="card-hand-stats" aria-label={model.handLabel}>
          <div>
            <dt>{model.handLabel}</dt>
            <dd key={`hand-${model.cards.length}`}>{model.cards.length}</dd>
          </div>
          {model.selectedCount > 0 ? (
            <div>
              <dt>{model.selectedLabel}</dt>
              <dd key={`selected-${model.selectedCount}`}>{model.selectedCount}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {model.helperText ? (
        <div key={model.helperText} className="card-hand-message" role="status" aria-live="polite">
          {model.helperText}
        </div>
      ) : null}

      <section className="card-hand-claim-panel" aria-label={model.claimLabel}>
        <div className="card-hand-claim-heading">
          <span>{model.claimLabel}</span>
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
                disabled={model.disabled || option.disabled || isPlayingCards || isChecking}
                onClick={option.onSelect}
              >
                {option.rank}
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="card-hand-playfield">
        <aside className="card-hand-pile-zone" aria-label={model.pileLabel}>
          <div ref={pileTargetRef} className={`card-hand-pile-stage ${visiblePileCount === 0 ? "is-empty" : ""}`}>
            <div key={`visible-pile-${visiblePileCount}`} className="card-hand-pile-stack" aria-hidden="true">
              {Array.from({ length: visiblePileCount }, (_, index) => (
                <img
                  key={`pile-card-${index}`}
                  src={model.cardBackUrl}
                  alt=""
                  style={pileCardStyle(index, visiblePileCount)}
                />
              ))}
            </div>
          </div>
          <div className="card-hand-pile-count" aria-label={`${model.pileLabel} ${model.pileCount}`}>
            <strong key={`pile-label-${model.pileCount}`}>{model.pileCount}</strong>
          </div>
          {model.lastPlayLabel ? <small key={model.lastPlayLabel}>{model.lastPlayLabel}</small> : null}
        </aside>

        <section className="card-hand-hand-zone" aria-label={model.handLabel}>
          <div className="card-hand-sort-row" aria-label={model.sortLabel}>
            <div>
              <button
                type="button"
                aria-pressed={sortMode === "rank"}
                className={sortMode === "rank" ? "is-selected" : ""}
                disabled={isPlayingCards || isChecking}
                onClick={() => setSortMode("rank")}
              >
                {model.rankSortLabel}
              </button>
              <button
                type="button"
                aria-pressed={sortMode === "suit"}
                className={sortMode === "suit" ? "is-selected" : ""}
                disabled={isPlayingCards || isChecking}
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
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(card.id, node);
                      } else {
                        cardRefs.current.delete(card.id);
                      }
                    }}
                    className={`card-hand-card ${red ? "is-red" : "is-black"} ${card.selected ? "is-selected" : ""} ${hoveredCardId === card.id ? "is-hovered" : ""} ${isPlayingCards && card.selected ? "is-launching" : ""}`}
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
                      disabled={model.disabled || card.disabled || isPlayingCards || isChecking}
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
      </main>

      <footer className="card-hand-actions">
        <button
          type="button"
          className="card-hand-action is-check"
          aria-label={model.checkLabel}
          disabled={model.disabled || !model.canCheck || isChecking || isPlayingCards}
          onClick={handleCheck}
        >
          <strong>{model.checkDisplayLabel}</strong>
          <span>{model.checkSubLabel}</span>
        </button>
        <button
          type="button"
          className="card-hand-action is-play"
          aria-label={model.playAccessibilityLabel}
          disabled={model.disabled || !model.canPlay || isPlayingCards || isChecking}
          onClick={handlePlay}
        >
          {isPlayingCards ? model.playingLabel : model.playLabel}
        </button>
        <button
          type="button"
          className="card-hand-action is-pass"
          disabled={model.disabled || !model.canPass || isChecking || isPlayingCards}
          onClick={handlePass}
        >
          {model.passLabel}
        </button>
      </footer>

      {flightCards.length > 0 ? (
        <div className="card-hand-flight-layer" aria-hidden="true">
          {flightCards.map((card) => {
            const symbol = suitSymbols[card.suit];
            const red = card.suit === "diamonds" || card.suit === "hearts";
            const style = {
              left: `${card.startX}px`,
              top: `${card.startY}px`,
              width: `${card.width}px`,
              height: `${card.height}px`,
              "--flight-mid-x": `${card.deltaX * 0.55}px`,
              "--flight-mid-y": `${card.deltaY * 0.45 - 70}px`,
              "--flight-delta-x": `${card.deltaX}px`,
              "--flight-delta-y": `${card.deltaY}px`,
              "--flight-delay": `${card.delayMs}ms`,
              "--flight-spin": `${card.spin}deg`
            } as CSSProperties;
            return (
              <div key={card.id} className="card-hand-flight-card" style={style}>
                <div className="card-hand-flight-inner">
                  <div className={`card-hand-flight-face ${red ? "is-red" : ""}`}>
                    <strong>{card.rank}</strong>
                    <span>{symbol}</span>
                  </div>
                  <img className="card-hand-flight-back" src={model.cardBackUrl} alt="" />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {isChecking ? (
        <div className="card-hand-check-impact" role="alert" aria-live="assertive">
          <div className="card-hand-check-flash" />
          <div className="card-hand-check-banner">
            <strong>{model.checkDisplayLabel}</strong>
            <span>{model.checkSubLabel}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
