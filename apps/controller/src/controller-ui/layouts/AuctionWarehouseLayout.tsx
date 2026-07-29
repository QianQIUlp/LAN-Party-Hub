// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  AuctionWarehouseLayoutModel,
  AuctionWarehouseStateModel,
  AuctionWarehouseVisibleItemModel
} from "./models.js";
import "./AuctionWarehouseLayout.css";

interface AuctionWarehouseLayoutProps {
  model: AuctionWarehouseLayoutModel;
}

type Copy = ReturnType<typeof getCopy>;

const rarityColors: Record<string, string> = {
  white: "#cbd5d9",
  green: "#45c486",
  blue: "#4aa9ff",
  purple: "#a96cff",
  gold: "#f2bf51",
  red: "#ff5b68"
};

const rarityLabels = {
  "zh-CN": { white: "白色", green: "绿色", blue: "蓝色", purple: "紫色", gold: "金色", red: "红色" },
  en: { white: "White", green: "Green", blue: "Blue", purple: "Purple", gold: "Gold", red: "Red" },
  de: { white: "Weiss", green: "Gruen", blue: "Blau", purple: "Violett", gold: "Gold", red: "Rot" }
} as const;

const categoryLabels = {
  "zh-CN": { relic: "遗物", art: "艺术", tech: "科技", nature: "自然", luxury: "珍玩", oddity: "奇物" },
  en: { relic: "Relic", art: "Art", tech: "Tech", nature: "Nature", luxury: "Luxury", oddity: "Oddity" },
  de: { relic: "Relikt", art: "Kunst", tech: "Technik", nature: "Natur", luxury: "Luxus", oddity: "Kuriosum" }
} as const;

function getCopy(language: AuctionWarehouseLayoutModel["language"]) {
  if (language === "en") {
    return {
      title: "VEILED WAREHOUSE",
      subtitle: "One warehouse. Five chances to close the deal.",
      rotateTitle: "Turn your phone sideways",
      rotateBody: "This controller is designed for landscape play.",
      rotateAction: "Enter landscape",
      waiting: "Preparing your private dossier…",
      setupEyebrow: "PRE-AUCTION BRIEFING",
      setupTitle: "Choose a specialist and equipment budget",
      setupBody: "Your specialist and instrument results remain private. The purchase cost comes from your bidding funds.",
      specialists: "1. Specialist",
      kits: "2. Instrument kit",
      rules: "Auction rule",
      rulesBody: "Every round publishes all bids and instrument names. A round closes immediately when the leading bid reaches its required lead.",
      remaining: "Funds after purchase",
      confirm: "Confirm loadout",
      confirmed: "Loadout locked — waiting for the auction",
      claimed: "Claimed",
      free: "No cost",
      round: "Round",
      setup: "Setup",
      reveal: "Round report",
      finished: "Auction complete",
      threshold: "Close condition",
      uniqueHigh: "unique high bid",
      lead: "lead over second",
      publicIntel: "Auctioneer public intel",
      privateIntel: "Your private intel",
      noIntel: "No report yet.",
      warehouse: "Known warehouse map",
      known: "known records",
      instruments: "Instruments",
      instrumentUsed: "Instrument committed",
      pass: "Pass",
      bid: "Submit bid",
      bidPlaceholder: "Bid amount",
      ownBid: "Your sealed bid",
      funds: "Available funds",
      history: "Round history",
      sealed: "SEALED",
      noInstrument: "No instrument",
      use: "Use now",
      close: "Close",
      catalog: "Smart catalog",
      catalogBody: "Candidates are calculated only from information visible to you.",
      rarityFilter: "Rarity filter",
      categoryFilter: "Category filter",
      footprintFilter: "Footprint filter",
      unknown: "Unknown",
      certain: "Certain",
      likely: "Likely",
      possible: "Possible",
      estimate: "Private warehouse estimate",
      trueValue: "True warehouse value",
      soldFor: "Winning bid",
      winner: "Winner",
      unsold: "Unsold",
      spectator: "You joined after the auction began and are watching as a spectator.",
      unavailable: "No instruments remain",
      kitFundHint: "Starting funds: 1,000,000"
    };
  }
  if (language === "de") {
    return {
      title: "VERSCHLEIERTES LAGER",
      subtitle: "Ein Lager. Fuenf Chancen auf den Zuschlag.",
      rotateTitle: "Handy quer halten",
      rotateBody: "Diese Steuerung ist fuer Querformat gestaltet.",
      rotateAction: "Querformat starten",
      waiting: "Privates Dossier wird vorbereitet…",
      setupEyebrow: "AUKTIONSBRIEFING",
      setupTitle: "Spezialist und Ausruestungsbudget waehlen",
      setupBody: "Spezialist und Instrumentergebnisse bleiben privat. Der Kaufpreis wird vom Bietkapital abgezogen.",
      specialists: "1. Spezialist",
      kits: "2. Instrumentenset",
      rules: "Auktionsregel",
      rulesBody: "Nach jeder Runde werden alle Gebote und Instrumentnamen veroeffentlicht. Der Zuschlag erfolgt bei ausreichendem Vorsprung sofort.",
      remaining: "Kapital nach Kauf",
      confirm: "Auswahl bestaetigen",
      confirmed: "Auswahl gesperrt — Auktion startet gleich",
      claimed: "Belegt",
      free: "Kostenlos",
      round: "Runde",
      setup: "Vorbereitung",
      reveal: "Rundenbericht",
      finished: "Auktion beendet",
      threshold: "Zuschlagsregel",
      uniqueHigh: "eindeutiges Hoechstgebot",
      lead: "Vorsprung auf Platz zwei",
      publicIntel: "Oeffentlicher Auktionsbericht",
      privateIntel: "Deine privaten Informationen",
      noIntel: "Noch kein Bericht.",
      warehouse: "Bekannte Lagerkarte",
      known: "bekannte Eintraege",
      instruments: "Instrumente",
      instrumentUsed: "Instrument eingesetzt",
      pass: "Passen",
      bid: "Gebot senden",
      bidPlaceholder: "Gebot",
      ownBid: "Dein verdecktes Gebot",
      funds: "Verfuegbares Kapital",
      history: "Rundenverlauf",
      sealed: "VERSIEGELT",
      noInstrument: "Kein Instrument",
      use: "Jetzt nutzen",
      close: "Schliessen",
      catalog: "Intelligenter Katalog",
      catalogBody: "Kandidaten werden nur aus deinen sichtbaren Informationen berechnet.",
      rarityFilter: "Seltenheit",
      categoryFilter: "Kategorie",
      footprintFilter: "Abmessung",
      unknown: "Unbekannt",
      certain: "Sicher",
      likely: "Wahrscheinlich",
      possible: "Moeglich",
      estimate: "Private Lagerschaetzung",
      trueValue: "Tatsaechlicher Lagerwert",
      soldFor: "Siegergebot",
      winner: "Gewinner",
      unsold: "Nicht verkauft",
      spectator: "Du bist nach Auktionsbeginn beigetreten und siehst als Zuschauer zu.",
      unavailable: "Keine Instrumente mehr",
      kitFundHint: "Startkapital: 1.000.000"
    };
  }
  return {
    title: "迷雾仓库",
    subtitle: "同一座仓库，五次提前落槌的机会",
    rotateTitle: "请把手机横过来",
    rotateBody: "这是横屏专用控制器，横屏后才能查看私人情报并出价。",
    rotateAction: "进入横屏",
    waiting: "正在建立你的私人档案…",
    setupEyebrow: "拍卖前简报",
    setupTitle: "选择一名专家，并决定仪器预算",
    setupBody: "角色能力与仪器结果只在你的控制器中显示；购买仪器的钱会从竞拍资金扣除。",
    specialists: "第一步 · 选择角色",
    kits: "第二步 · 购买仪器组",
    rules: "成交规则",
    rulesBody: "每轮结束公开所有人的出价和仪器名称；领先倍率达到本轮条件时，整座仓库立即成交。",
    remaining: "购买后可用资金",
    confirm: "确认角色与仪器组",
    confirmed: "配置已锁定，等待拍卖开始",
    claimed: "已被选择",
    free: "不花费",
    round: "竞拍第",
    setup: "配置阶段",
    reveal: "本轮公开结算",
    finished: "拍卖结束",
    threshold: "本轮成交条件",
    uniqueHigh: "唯一最高价",
    lead: "领先第二名",
    publicIntel: "拍卖师公开情报",
    privateIntel: "仅你可见的私人情报",
    noIntel: "暂无情报。",
    warehouse: "你的已知仓库",
    known: "条已知记录",
    instruments: "仪器",
    instrumentUsed: "本轮仪器已封存",
    pass: "放弃本轮",
    bid: "密封出价",
    bidPlaceholder: "输入金额",
    ownBid: "我的密封出价",
    funds: "当前可用资金",
    history: "逐轮记录",
    sealed: "等待公开",
    noInstrument: "本轮不用仪器",
    use: "立即使用",
    close: "关闭",
    catalog: "智能藏品图鉴",
    catalogBody: "候选结果只根据你已经获得的公开与私人情报计算，不会读取仓库答案。",
    rarityFilter: "品质筛选",
    categoryFilter: "类型筛选",
    footprintFilter: "占格筛选",
    unknown: "未知",
    certain: "只能是",
    likely: "很大概率",
    possible: "可能是",
    estimate: "私人整仓估值",
    trueValue: "整仓真实价值",
    soldFor: "成交价格",
    winner: "拍得玩家",
    unsold: "仓库流拍",
    spectator: "你在拍卖开始后加入，本局只能旁观，下一局可正常参与。",
    unavailable: "没有剩余仪器",
    kitFundHint: "每人初始资金 1,000,000"
  };
}

function formatMoney(value: number, language: AuctionWarehouseLayoutModel["language"]): string {
  return new Intl.NumberFormat(language === "zh-CN" ? "zh-CN" : language === "de" ? "de-DE" : "en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(value)));
}

function useCountdown(stageEndsAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  return stageEndsAt === null ? 0 : Math.max(0, Math.ceil((stageEndsAt - now) / 1000));
}

async function requestLandscape(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  } catch {
    // Fullscreen can be unavailable on iOS; the portrait gate still enforces layout.
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
    await orientation.lock?.("landscape");
  } catch {
    // Safari does not expose orientation locking. The player can rotate manually.
  }
}

function stageLabel(state: AuctionWarehouseStateModel, copy: Copy): string {
  if (state.stage === "setup") return copy.setup;
  if (state.stage === "round_reveal") return copy.reveal;
  if (state.stage === "finished") return copy.finished;
  return `${copy.round} ${state.currentRound} / ${state.totalRounds}`;
}

function SetupView({ model, state, copy }: {
  model: AuctionWarehouseLayoutModel;
  state: AuctionWarehouseStateModel;
  copy: Copy;
}) {
  const selectedKit = state.availableKits.find((kit) => kit.id === state.ownKitId);
  const remaining = state.startingFunds - (selectedKit?.cost ?? 0);
  const claimedRoleIds = new Set(
    state.players
      .filter((player) => player.playerId !== state.playerId)
      .map((player) => player.roleId)
      .filter((roleId): roleId is string => Boolean(roleId))
  );

  return (
    <div className="auction-setup-view">
      <header className="auction-setup-header">
        <div>
          <p>{copy.setupEyebrow}</p>
          <h1>{copy.setupTitle}</h1>
          <span>{copy.setupBody}</span>
        </div>
        <div className="auction-funds-card">
          <small>{copy.remaining}</small>
          <strong>{formatMoney(remaining, model.language)}</strong>
          <span>{copy.kitFundHint}</span>
        </div>
      </header>

      <div className="auction-setup-columns">
        <section className="auction-setup-panel auction-role-panel">
          <div className="auction-section-heading">
            <h2>{copy.specialists}</h2>
            <span>{state.availableRoles.length}</span>
          </div>
          <div className="auction-role-grid">
            {state.availableRoles.map((role) => {
              const selected = state.ownRoleId === role.id;
              const claimed = claimedRoleIds.has(role.id);
              return (
                <button
                  type="button"
                  key={role.id}
                  className={`auction-role-card${selected ? " is-selected" : ""}`}
                  style={{ "--auction-accent": role.accent } as CSSProperties}
                  disabled={model.disabled || !state.canConfigure || claimed}
                  onClick={() => model.onSelectRole(role.id)}
                >
                  {role.portraitPath ? <img src={role.portraitPath} alt="" /> : null}
                  <span className="auction-role-copy">
                    <strong>{role.name}</strong>
                    <small>{claimed ? copy.claimed : role.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="auction-setup-panel auction-kit-panel">
          <div className="auction-section-heading">
            <h2>{copy.kits}</h2>
          </div>
          <div className="auction-kit-list">
            {state.availableKits.map((kit) => {
              const selected = state.ownKitId === kit.id;
              return (
                <button
                  type="button"
                  key={kit.id}
                  className={`auction-kit-card${selected ? " is-selected" : ""}`}
                  style={{ "--auction-accent": kit.accent } as CSSProperties}
                  disabled={model.disabled || !state.canConfigure}
                  onClick={() => model.onSelectKit(kit.id)}
                >
                  <span>
                    <strong>{kit.name}</strong>
                    <small>{kit.description}</small>
                  </span>
                  <b>{kit.cost === 0 ? copy.free : formatMoney(kit.cost, model.language)}</b>
                </button>
              );
            })}
          </div>
          <div className="auction-rule-card">
            <strong>{copy.rules}</strong>
            <p>{copy.rulesBody}</p>
            <div className="auction-threshold-track">
              {["2.0×", "1.7×", "1.5×", "1.3×", "TOP"].map((value, index) => (
                <span key={value}><small>R{index + 1}</small>{value}</span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="auction-confirm-button"
            disabled={model.disabled || !state.canConfigure || !state.ownRoleId || !state.ownKitId}
            onClick={model.onConfirmSetup}
          >
            {state.setupConfirmed ? copy.confirmed : copy.confirm}
          </button>
        </section>
      </div>
    </div>
  );
}

function PlayerHistory({ state, language, copy, onInstrument }: {
  state: AuctionWarehouseStateModel;
  language: AuctionWarehouseLayoutModel["language"];
  copy: Copy;
  onInstrument: (instrumentId: string) => void;
}) {
  const instruments = new Map(state.instruments.map((entry) => [entry.id, entry]));
  const roles = new Map(state.availableRoles.map((entry) => [entry.id, entry]));

  return (
    <section className="auction-player-rail" aria-label={copy.history}>
      <div className="auction-rail-title">
        <span>{copy.history}</span>
        <small>{state.players.length}</small>
      </div>
      <div className="auction-player-list">
        {state.players.map((player) => {
          const role = player.roleId ? roles.get(player.roleId) : undefined;
          const own = player.playerId === state.playerId;
          return (
            <article className={`auction-player-row${own ? " is-own" : ""}`} key={player.playerId}>
              <div className="auction-player-identity" style={{ "--player-color": player.color } as CSSProperties}>
                {role?.portraitPath ? <img src={role.portraitPath} alt="" /> : null}
                <span><strong>{player.name}</strong><small>{player.roleName ?? "—"}</small></span>
              </div>
              <div className="auction-history-grid">
                {Array.from({ length: state.totalRounds }, (_, index) => {
                  const round = index + 1;
                  const history = state.history.find((entry) => entry.round === round);
                  const instrumentId = history?.instruments[player.playerId] ?? null;
                  const instrument = instrumentId ? instruments.get(instrumentId) : undefined;
                  const activeSealed = state.stage === "round_active" && round === state.currentRound;
                  return (
                    <div className={`auction-history-cell${history ? " is-public" : ""}`} key={round}>
                      <small>R{round}</small>
                      {history ? (
                        <>
                          <button
                            type="button"
                            disabled={!instrument}
                            onClick={() => instrument && onInstrument(instrument.id)}
                            title={instrument?.name ?? copy.noInstrument}
                          >
                            {instrument?.iconPath ? <img src={instrument.iconPath} alt="" /> : <span>{instrument ? instrument.name.slice(0, 2) : "—"}</span>}
                          </button>
                          <b>{formatMoney(history.bids[player.playerId] ?? 0, language)}</b>
                        </>
                      ) : (
                        <span className={activeSealed ? "is-sealed" : ""}>{activeSealed ? copy.sealed : "—"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IntelligencePanel({ state, copy, language }: {
  state: AuctionWarehouseStateModel;
  copy: Copy;
  language: AuctionWarehouseLayoutModel["language"];
}) {
  const publicNotes = [...state.publicNotes].sort((left, right) => right.round - left.round);
  const privateNotes = [...state.privateNotes].sort((left, right) => right.round - left.round);
  return (
    <section className="auction-intel-panel">
      <div className="auction-intel-group is-public">
        <div className="auction-intel-heading"><span>{copy.publicIntel}</span><small>{publicNotes.length}</small></div>
        <div className="auction-intel-scroll">
          {publicNotes.length ? publicNotes.map((note) => (
            <article key={note.id}><small>ROUND {note.round}</small><p>{note.text}</p></article>
          )) : <p className="auction-empty-copy">{copy.noIntel}</p>}
        </div>
      </div>
      <div className="auction-intel-group is-private">
        <div className="auction-intel-heading"><span>{copy.privateIntel}</span><small>{privateNotes.length}</small></div>
        <div className="auction-intel-scroll">
          {privateNotes.length ? privateNotes.map((note) => (
            <article key={note.id} data-source={note.source}><small>ROUND {note.round} · {note.source.toUpperCase()}</small><p>{note.text}</p></article>
          )) : <p className="auction-empty-copy">{copy.noIntel}</p>}
        </div>
        {state.estimatedWarehouseMin !== null && state.estimatedWarehouseMax !== null ? (
          <div className="auction-estimate-card"><small>{copy.estimate}</small><strong>{formatMoney(state.estimatedWarehouseMin, language)}–{formatMoney(state.estimatedWarehouseMax, language)}</strong></div>
        ) : null}
      </div>
    </section>
  );
}

function itemGridStyle(item: AuctionWarehouseVisibleItemModel): CSSProperties {
  const x = item.outlineKnown ? item.x ?? item.anchorX : item.anchorX;
  const y = item.outlineKnown ? item.y ?? item.anchorY : item.anchorY;
  const width = item.outlineKnown ? item.width ?? 1 : 1;
  const height = item.outlineKnown ? item.height ?? 1 : 1;
  return {
    left: `calc(${x} * (100% / var(--warehouse-cols)) + 3px)`,
    top: `calc(${y} * (100% / var(--warehouse-rows)) + 3px)`,
    width: `calc(${width} * (100% / var(--warehouse-cols)) - 6px)`,
    height: `calc(${height} * (100% / var(--warehouse-rows)) - 6px)`,
    "--rarity-color": item.rarity ? rarityColors[item.rarity] ?? "#7b8791" : "#87929b"
  } as CSSProperties;
}

function WarehouseBoard({ state, copy, language, onSelect }: {
  state: AuctionWarehouseStateModel;
  copy: Copy;
  language: AuctionWarehouseLayoutModel["language"];
  onSelect: (instanceId: string) => void;
}) {
  return (
    <section className="auction-warehouse-panel">
      <div className="auction-warehouse-heading">
        <span>{copy.warehouse}</span>
        <small>{state.warehouse.items.length} {copy.known}</small>
      </div>
      <div
        className="auction-warehouse-grid"
        style={{
          "--warehouse-cols": state.warehouse.cols,
          "--warehouse-rows": state.warehouse.rows,
          aspectRatio: `${state.warehouse.cols} / ${state.warehouse.rows}`
        } as CSSProperties}
      >
        {state.warehouse.items.map((item) => (
          <button
            type="button"
            key={item.instanceId}
            className={`auction-warehouse-item${item.outlineKnown ? " has-outline" : " is-anchor"}${item.rarityKnown ? " has-rarity" : ""}${item.identityKnown ? " is-identified" : ""}`}
            style={itemGridStyle(item)}
            onClick={() => onSelect(item.instanceId)}
            aria-label={item.name ?? copy.catalog}
          >
            {item.imagePath && item.identityKnown ? <img src={item.imagePath} alt="" /> : null}
            {item.identityKnown && item.name ? <span>{item.name}</span> : null}
            {!item.identityKnown && item.categoryKnown && item.category ? (
              <small>{categoryLabels[language][item.category as keyof typeof categoryLabels["zh-CN"]] ?? item.category}</small>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function InstrumentModal({ state, copy, onClose, onUse }: {
  state: AuctionWarehouseStateModel;
  copy: Copy;
  onClose: () => void;
  onUse: (id: string) => void;
}) {
  const available = state.instruments.filter((instrument) => state.ownInstrumentInventory.includes(instrument.id));
  return (
    <div className="auction-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auction-modal auction-instrument-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><small>PRIVATE LOADOUT</small><h2>{copy.instruments}</h2></div><button type="button" onClick={onClose}>{copy.close}</button></header>
        <div className="auction-instrument-list">
          {available.length ? available.map((instrument) => (
            <button type="button" key={instrument.id} disabled={!state.canAct || Boolean(state.ownCurrentInstrument)} onClick={() => onUse(instrument.id)}>
              {instrument.iconPath ? <img src={instrument.iconPath} alt="" /> : null}
              <span><strong>{instrument.name}</strong><small>{instrument.description}</small></span>
              <b>{copy.use}</b>
            </button>
          )) : <p className="auction-empty-copy">{copy.unavailable}</p>}
        </div>
      </section>
    </div>
  );
}

function InstrumentDetailModal({ state, instrumentId, copy, onClose }: {
  state: AuctionWarehouseStateModel;
  instrumentId: string;
  copy: Copy;
  onClose: () => void;
}) {
  const instrument = state.instruments.find((entry) => entry.id === instrumentId);
  if (!instrument) return null;
  return (
    <div className="auction-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auction-modal auction-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        {instrument.iconPath ? <img src={instrument.iconPath} alt="" /> : null}
        <small>PUBLIC INSTRUMENT RECORD</small>
        <h2>{instrument.name}</h2>
        <p>{instrument.description}</p>
        <button type="button" onClick={onClose}>{copy.close}</button>
      </section>
    </div>
  );
}

function CatalogModal({ model, state, item, copy, onClose }: {
  model: AuctionWarehouseLayoutModel;
  state: AuctionWarehouseStateModel;
  item: AuctionWarehouseVisibleItemModel;
  copy: Copy;
  onClose: () => void;
}) {
  const candidates = state.candidatesByInstanceId[item.instanceId] ?? [];
  const rarity = item.rarity
    ? rarityLabels[model.language][item.rarity as keyof typeof rarityLabels["zh-CN"]] ?? item.rarity
    : copy.unknown;
  const category = item.category
    ? categoryLabels[model.language][item.category as keyof typeof categoryLabels["zh-CN"]] ?? item.category
    : copy.unknown;
  const footprint = item.outlineKnown ? `${item.width} × ${item.height}` : copy.unknown;
  return (
    <div className="auction-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auction-modal auction-catalog-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <aside>
          <div><small>PRIVATE DEDUCTION</small><h2>{copy.catalog}</h2><p>{copy.catalogBody}</p></div>
          <dl>
            <div><dt>{copy.rarityFilter}</dt><dd style={{ "--filter-color": item.rarity ? rarityColors[item.rarity] : "#7b8791" } as CSSProperties}>{rarity}</dd></div>
            <div><dt>{copy.categoryFilter}</dt><dd>{category}</dd></div>
            <div><dt>{copy.footprintFilter}</dt><dd>{footprint}</dd></div>
          </dl>
          <button type="button" onClick={onClose}>{copy.close}</button>
        </aside>
        <div className="auction-candidate-list">
          {candidates.map((candidate) => (
            <article key={candidate.catalogId} style={{ "--rarity-color": rarityColors[candidate.rarity] } as CSSProperties}>
              {candidate.imagePath ? <img src={candidate.imagePath} alt="" /> : null}
              <div>
                <small>{candidate.confidence === "certain" ? copy.certain : candidate.confidence === "likely" ? copy.likely : copy.possible}</small>
                <h3>{candidate.name}</h3>
                <p>{candidate.reasons.join(" · ") || copy.catalogBody}</p>
                <span>{categoryLabels[model.language][candidate.category as keyof typeof categoryLabels["zh-CN"]] ?? candidate.category} · {candidate.width}×{candidate.height}</span>
              </div>
              <footer><strong>{Math.round(candidate.probability * 100)}%</strong><b>{formatMoney(candidate.value, model.language)}</b></footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuctionActions({ model, state, copy, onOpenInstruments }: {
  model: AuctionWarehouseLayoutModel;
  state: AuctionWarehouseStateModel;
  copy: Copy;
  onOpenInstruments: () => void;
}) {
  const [bid, setBid] = useState(() => state.ownBid ?? Math.min(100_000, state.ownFunds));
  useEffect(() => {
    if (state.ownBid !== null) setBid(state.ownBid);
  }, [state.ownBid]);
  const canAct = state.canAct && !model.disabled && state.ownBid === null;
  const validBid = Number.isSafeInteger(bid) && bid > 0 && bid <= state.ownFunds;
  const instrument = state.instruments.find((entry) => entry.id === state.ownCurrentInstrument);

  return (
    <footer className="auction-action-bar">
      <button type="button" className="auction-instrument-button" disabled={!state.canAct || Boolean(state.ownCurrentInstrument)} onClick={onOpenInstruments}>
        <span>{instrument ? copy.instrumentUsed : copy.instruments}</span>
        <small>{instrument?.name ?? `${state.ownInstrumentInventory.length} AVAILABLE`}</small>
      </button>
      <div className="auction-bid-composer">
        <div className="auction-bid-copy"><small>{state.ownBid !== null ? copy.ownBid : copy.funds}</small><strong>{formatMoney(state.ownBid ?? state.ownFunds, model.language)}</strong></div>
        <div className="auction-bid-input">
          <input
            type="number"
            min={1}
            max={state.ownFunds}
            step={1_000}
            value={bid}
            disabled={!canAct}
            aria-label={copy.bidPlaceholder}
            onChange={(event) => setBid(Math.max(0, Math.floor(Number(event.target.value))))}
          />
          {[0.25, 0.5, 0.75].map((ratio) => (
            <button type="button" key={ratio} disabled={!canAct} onClick={() => setBid(Math.floor(state.ownFunds * ratio))}>{Math.round(ratio * 100)}%</button>
          ))}
        </div>
      </div>
      <button type="button" className="auction-pass-button" disabled={!canAct} onClick={() => model.onSubmitBid(0)}>{copy.pass}</button>
      <button type="button" className="auction-bid-button" disabled={!canAct || !validBid} onClick={() => model.onSubmitBid(bid)}>{copy.bid}</button>
    </footer>
  );
}

function AuctionView({ model, state, copy }: {
  model: AuctionWarehouseLayoutModel;
  state: AuctionWarehouseStateModel;
  copy: Copy;
}) {
  const remaining = useCountdown(state.stageEndsAt);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [detailInstrumentId, setDetailInstrumentId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = selectedItemId
    ? state.warehouse.items.find((item) => item.instanceId === selectedItemId) ?? null
    : null;
  const winner = state.players.find((player) => player.playerId === state.soldToPlayerId);

  return (
    <div className="auction-play-view">
      <header className="auction-play-header">
        <div className="auction-brand"><small>LAN AUCTION / {model.roomCode ?? "—"}</small><strong>{copy.title}</strong></div>
        <div className="auction-stage-chip"><span>{stageLabel(state, copy)}</span>{state.stageEndsAt !== null ? <b>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</b> : null}</div>
        <div className="auction-condition-card"><small>{copy.threshold}</small><strong>{state.currentRound >= 5 ? copy.uniqueHigh : `${state.threshold.toFixed(1)}× ${copy.lead}`}</strong></div>
        <div className="auction-balance-card"><small>{copy.funds}</small><strong>{formatMoney(state.ownFunds, model.language)}</strong></div>
      </header>

      {state.spectator ? <div className="auction-spectator-banner">{copy.spectator}</div> : null}
      {model.message ? <div className="auction-message-strip">{model.message}</div> : null}

      <main className="auction-play-columns">
        <PlayerHistory state={state} language={model.language} copy={copy} onInstrument={setDetailInstrumentId} />
        <IntelligencePanel state={state} copy={copy} language={model.language} />
        <WarehouseBoard state={state} copy={copy} language={model.language} onSelect={setSelectedItemId} />
      </main>

      {state.stage === "finished" ? (
        <div className="auction-final-strip">
          <span><small>{winner ? copy.winner : copy.unsold}</small><strong>{winner?.name ?? copy.unsold}</strong></span>
          <span><small>{copy.soldFor}</small><strong>{formatMoney(state.soldFor, model.language)}</strong></span>
          <span><small>{copy.trueValue}</small><strong>{formatMoney(state.trueWarehouseValue ?? 0, model.language)}</strong></span>
          {model.ready ? <button type="button" onClick={model.ready.onToggleReady}>{model.ready.label} · {model.ready.readyCount}/{model.ready.playerCount}</button> : null}
        </div>
      ) : <AuctionActions model={model} state={state} copy={copy} onOpenInstruments={() => setInstrumentOpen(true)} />}

      {instrumentOpen ? <InstrumentModal state={state} copy={copy} onClose={() => setInstrumentOpen(false)} onUse={(id) => { model.onUseInstrument(id); setInstrumentOpen(false); }} /> : null}
      {detailInstrumentId ? <InstrumentDetailModal state={state} instrumentId={detailInstrumentId} copy={copy} onClose={() => setDetailInstrumentId(null)} /> : null}
      {selectedItem ? <CatalogModal model={model} state={state} item={selectedItem} copy={copy} onClose={() => setSelectedItemId(null)} /> : null}
    </div>
  );
}

export function AuctionWarehouseLayout({ model }: AuctionWarehouseLayoutProps) {
  const copy = useMemo(() => getCopy(model.language), [model.language]);
  const state = model.state;
  return (
    <div className="auction-warehouse-shell">
      <div className="auction-warehouse-rotate-gate">
        <h1>{copy.rotateTitle}</h1>
        <p>{copy.rotateBody}</p>
        <button type="button" onClick={() => void requestLandscape()}>{copy.rotateAction}</button>
      </div>
      {!state ? <div className="auction-waiting-view"><strong>{copy.title}</strong><p>{copy.waiting}</p></div>
        : state.stage === "setup" ? <SetupView model={model} state={state} copy={copy} />
        : <AuctionView model={model} state={state} copy={copy} />}
    </div>
  );
}
