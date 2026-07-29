import type { SupportedLanguage } from "@open-party-lab/game-core";
import type {
  AuctionCatalogItem,
  AuctionCategory,
  AuctionInstrumentId,
  AuctionKitId,
  AuctionRarity,
  AuctionRoleId,
  LocalizedText
} from "../protocol.js";

export const rarityOrder: AuctionRarity[] = ["white", "green", "blue", "purple", "gold", "red"];

export const rarityColors: Record<AuctionRarity, string> = {
  white: "#d8dee9",
  green: "#39d98a",
  blue: "#4da3ff",
  purple: "#a66cff",
  gold: "#f4c95d",
  red: "#ff4f70"
};

export const rarityNames: Record<AuctionRarity, LocalizedText> = {
  white: { "zh-CN": "白色", en: "White", de: "Weiss" },
  green: { "zh-CN": "绿色", en: "Green", de: "Gruen" },
  blue: { "zh-CN": "蓝色", en: "Blue", de: "Blau" },
  purple: { "zh-CN": "紫色", en: "Purple", de: "Violett" },
  gold: { "zh-CN": "金色", en: "Gold", de: "Gold" },
  red: { "zh-CN": "红色", en: "Red", de: "Rot" }
};

export const categoryNames: Record<AuctionCategory, LocalizedText> = {
  relic: { "zh-CN": "古物", en: "Relic", de: "Relikt" },
  art: { "zh-CN": "艺术", en: "Art", de: "Kunst" },
  tech: { "zh-CN": "机械", en: "Tech", de: "Technik" },
  nature: { "zh-CN": "自然", en: "Nature", de: "Natur" },
  luxury: { "zh-CN": "珍饰", en: "Luxury", de: "Luxus" },
  oddity: { "zh-CN": "奇珍", en: "Oddity", de: "Kuriosum" }
};

function text(zh: string, en: string, de: string): LocalizedText {
  return { "zh-CN": zh, en, de };
}

function assetPath(folder: "items" | "roles" | "instruments", id: string): string {
  return `/auction-king/images/${folder}/${id.replaceAll("_", "-")}.png`;
}

export function localize(value: LocalizedText, language: SupportedLanguage): string {
  return value[language] ?? value["zh-CN"];
}

const auctionCatalogDefinitions: AuctionCatalogItem[] = [
  { id: "brass-compass", name: text("旧铜航向仪", "Brass Wayfinder", "Messing-Wegweiser"), category: "relic", rarity: "white", value: 28_000, width: 1, height: 1, spawnWeight: 9 },
  { id: "ceramic-vial", name: text("釉彩标本瓶", "Glazed Specimen Vial", "Glasierte Probenphiole"), category: "nature", rarity: "white", value: 34_000, width: 1, height: 2, spawnWeight: 8 },
  { id: "archive-stamps", name: text("旧城印章组", "Old City Stamp Set", "Altes Stadtsiegel-Set"), category: "relic", rarity: "white", value: 42_000, width: 2, height: 1, spawnWeight: 8 },
  { id: "surveyor-notebook", name: text("测绘员手记", "Surveyor Notebook", "Vermesser-Notizbuch"), category: "art", rarity: "white", value: 38_000, width: 1, height: 2, spawnWeight: 8 },
  { id: "lacquer-tea-caddy", name: text("黑漆茶匣", "Lacquer Tea Caddy", "Lackierte Teedose"), category: "luxury", rarity: "white", value: 48_000, width: 2, height: 2, spawnWeight: 7 },
  { id: "meteorite-offcut", name: text("陨铁边角料", "Meteorite Offcut", "Meteoriten-Abschnitt"), category: "nature", rarity: "white", value: 45_000, width: 2, height: 1, spawnWeight: 7 },

  { id: "tide-clock", name: text("潮汐玻璃钟", "Glass Tide Clock", "Glas-Gezeitenuhr"), category: "tech", rarity: "green", value: 72_000, width: 2, height: 2, spawnWeight: 7 },
  { id: "clockwork-bird", name: text("发条鸣鸟", "Clockwork Songbird", "Uhrwerk-Singvogel"), category: "tech", rarity: "green", value: 86_000, width: 2, height: 1, spawnWeight: 7 },
  { id: "moss-terrarium", name: text("恒温苔景箱", "Moss Terrarium", "Moos-Terrarium"), category: "nature", rarity: "green", value: 94_000, width: 2, height: 3, spawnWeight: 6 },
  { id: "enamel-telescope", name: text("珐琅袖珍镜", "Enamel Spyglass", "Emaille-Fernrohr"), category: "luxury", rarity: "green", value: 78_000, width: 3, height: 1, spawnWeight: 7 },
  { id: "silk-map-case", name: text("织金星图匣", "Silk Star-Map Case", "Seiden-Sternkartenetui"), category: "art", rarity: "green", value: 90_000, width: 1, height: 3, spawnWeight: 6 },

  { id: "aurora-lens", name: text("极光折射镜", "Aurora Lens", "Aurora-Linse"), category: "tech", rarity: "blue", value: 138_000, width: 2, height: 2, spawnWeight: 5 },
  { id: "resonant-fork", name: text("共振银音叉", "Resonant Silver Fork", "Resonanz-Stimmgabel"), category: "tech", rarity: "blue", value: 126_000, width: 1, height: 3, spawnWeight: 5 },
  { id: "stormglass-engine", name: text("风暴玻璃机芯", "Stormglass Engine", "Sturmglas-Werk"), category: "oddity", rarity: "blue", value: 152_000, width: 3, height: 2, spawnWeight: 5 },
  { id: "moonstone-board", name: text("月辉石棋盘", "Moonstone Game Board", "Mondstein-Spielbrett"), category: "luxury", rarity: "blue", value: 144_000, width: 3, height: 3, spawnWeight: 4 },
  { id: "botanical-codex", name: text("夜光植物图典", "Luminous Botanical Codex", "Leuchtender Pflanzenkodex"), category: "art", rarity: "blue", value: 118_000, width: 2, height: 3, spawnWeight: 5 },

  { id: "gravity-decanter", name: text("逆重力醒酒器", "Gravity Decanter", "Gravitations-Dekanter"), category: "oddity", rarity: "purple", value: 235_000, width: 2, height: 3, spawnWeight: 3 },
  { id: "memory-loom", name: text("记忆织机", "Memory Loom", "Erinnerungswebstuhl"), category: "tech", rarity: "purple", value: 268_000, width: 4, height: 2, spawnWeight: 3 },
  { id: "obsidian-orrery", name: text("黑曜星轨仪", "Obsidian Orrery", "Obsidian-Orrery"), category: "relic", rarity: "purple", value: 248_000, width: 3, height: 3, spawnWeight: 3 },
  { id: "whisper-mask", name: text("静语面具", "Whisper Mask", "Fluestermaske"), category: "art", rarity: "purple", value: 218_000, width: 2, height: 2, spawnWeight: 3 },

  { id: "solar-crown", name: text("日冕冠冕", "Solar Crown", "Sonnenkrone"), category: "luxury", rarity: "gold", value: 390_000, width: 3, height: 2, spawnWeight: 2 },
  { id: "phoenix-automaton", name: text("赤铜不灭鸟", "Phoenix Automaton", "Phoenix-Automat"), category: "tech", rarity: "gold", value: 445_000, width: 4, height: 3, spawnWeight: 2 },

  { id: "singularity-reliquary", name: text("奇点圣匣", "Singularity Reliquary", "Singularitaets-Reliquiar"), category: "oddity", rarity: "red", value: 680_000, width: 4, height: 4, spawnWeight: 1 },
  { id: "timekeeper-vault", name: text("逆时保险匣", "Timekeeper Vault", "Zeitwaechter-Tresor"), category: "relic", rarity: "red", value: 620_000, width: 3, height: 4, spawnWeight: 1 }
];

export const auctionCatalog: AuctionCatalogItem[] = auctionCatalogDefinitions.map((entry) => ({
  ...entry,
  imagePath: assetPath("items", entry.id)
}));

export interface RoleDefinition {
  id: AuctionRoleId;
  name: LocalizedText;
  description: LocalizedText;
  accent: string;
  portraitPath?: string;
}

const auctionRoleDefinitions: RoleDefinition[] = [
  {
    id: "spectrum_cartographer",
    name: text("色谱测绘师", "Spectrum Cartographer", "Spektrum-Kartografin"),
    description: text("第1至4回合依次显示白、绿、蓝、紫色藏品轮廓；第5回合再显示一件金色或红色藏品。", "Rounds 1–4 reveal white, green, blue, then purple outlines; round 5 reveals one gold or red item.", "Runden 1–4 zeigen nacheinander weisse, gruene, blaue und violette Umrisse; Runde 5 zeigt ein goldenes oder rotes Objekt."),
    accent: "#61d3ff"
  },
  {
    id: "apex_hunter",
    name: text("巅峰猎手", "Apex Hunter", "Gipfeljaegerin"),
    description: text("开局显示一件最高品质藏品的轮廓；此后每回合显示一件随机藏品的品质与轮廓。", "Reveals one highest-rarity outline at the start, then one random item's rarity and outline each round.", "Zeigt zu Beginn den Umriss eines Objekts hoechster Seltenheit und danach jede Runde Seltenheit und Umriss eines zufaelligen Objekts."),
    accent: "#ff6c7d"
  },
  {
    id: "fog_classifier",
    name: text("雾区分类师", "Fog Classifier", "Nebel-Klassifizierer"),
    description: text("前3回合各显示一种未知类别藏品的轮廓；第5回合显示所有品质已知藏品的轮廓。", "Rounds 1–3 reveal an outline from an unknown category; round 5 reveals every item whose rarity is already known.", "Runden 1–3 zeigen je einen Umriss unbekannter Kategorie; Runde 5 zeigt alle Objekte mit bekannter Seltenheit."),
    accent: "#74e0b5"
  },
  {
    id: "echo_archivist",
    name: text("回声记录员", "Echo Archivist", "Echo-Archivarin"),
    description: text("开局短暂展示8件随机藏品轮廓；第3回合重新显示并永久记录同一批藏品。", "Briefly previews eight random outlines, then permanently restores the same set in round 3.", "Zeigt kurz acht zufaellige Umrisse und stellt dieselbe Gruppe in Runde 3 dauerhaft wieder her."),
    accent: "#bb83ff"
  },
  {
    id: "spatial_engineer",
    name: text("空间工程师", "Spatial Engineer", "Raumingenieur"),
    description: text("每回合显示一件尚未识别的最大占格藏品；第4回合额外获知大型藏品占用总格数。", "Each round reveals one of the largest unknown footprints; round 4 also reports the cells occupied by large items.", "Zeigt jede Runde einen der groessten unbekannten Umrisse; Runde 4 meldet zusaetzlich die von Grossobjekten belegten Felder."),
    accent: "#ffb65c"
  },
  {
    id: "value_auditor",
    name: text("价值审计员", "Value Auditor", "Wertprueferin"),
    description: text("每回合获得一种品质的平均价值区间；第5回合获得整座仓库的总价值区间。", "Receives an average-value range for one rarity each round and a total warehouse range in round 5.", "Erhaelt jede Runde einen Durchschnittswert-Bereich fuer eine Seltenheit und in Runde 5 einen Gesamtwert-Bereich."),
    accent: "#f4cf62"
  }
];

export const auctionRoles: RoleDefinition[] = auctionRoleDefinitions.map((entry) => ({
  ...entry,
  portraitPath: assetPath("roles", entry.id)
}));

export interface KitDefinition {
  id: AuctionKitId;
  name: LocalizedText;
  description: LocalizedText;
  cost: number;
  strength: 0 | 1 | 2 | 3;
  accent: string;
}

export const auctionKits: KitDefinition[] = [
  { id: "none", name: text("不购买", "Keep the Funds", "Kapital behalten"), description: text("不携带仪器，保留全部竞拍资金。", "Bring no instruments and preserve all bidding funds.", "Keine Instrumente; das gesamte Kapital bleibt erhalten."), cost: 0, strength: 0, accent: "#aab2c0" },
  { id: "survey", name: text("基础勘探组", "Survey Kit", "Erkundungsset"), description: text("六件基础仪器，覆盖范围较小。", "Six entry-level instruments with modest coverage.", "Sechs Basisinstrumente mit kleiner Reichweite."), cost: 10_000, strength: 1, accent: "#65d6c4" },
  { id: "professional", name: text("专业鉴定组", "Professional Kit", "Profi-Set"), description: text("六件均衡仪器，情报覆盖与成本适中。", "Six balanced instruments with stronger coverage.", "Sechs ausgewogene Instrumente mit groesserer Reichweite."), cost: 50_000, strength: 2, accent: "#65a9ff" },
  { id: "deep_scan", name: text("深层分析组", "Deep Scan Kit", "Tiefenanalyse-Set"), description: text("六件高强度仪器，以10万资金换取最大情报优势。", "Six high-output instruments trading 100,000 funds for maximum information.", "Sechs Hochleistungsinstrumente; 100.000 Kapital fuer maximale Information."), cost: 100_000, strength: 3, accent: "#d884ff" }
];

export interface InstrumentDefinition {
  id: AuctionInstrumentId;
  name: LocalizedText;
  description: LocalizedText;
  iconPath?: string;
}

const auctionInstrumentDefinitions: InstrumentDefinition[] = [
  { id: "largest_appraiser", name: text("特殊鉴定仪", "Largest-Item Appraiser", "Grossobjekt-Pruefer"), description: text("显示占格数最大的一件未知藏品的品质与轮廓。", "Reveals the rarity and outline of one largest unknown item.", "Zeigt Seltenheit und Umriss eines groessten unbekannten Objekts.") },
  { id: "quality_array", name: text("超级品鉴阵列", "Quality Array", "Qualitaets-Array"), description: text("随机显示多件藏品的品质。", "Reveals the rarity of several random items.", "Zeigt die Seltenheit mehrerer zufaelliger Objekte.") },
  { id: "outline_engine", name: text("超级尺寸引擎", "Outline Engine", "Umriss-Engine"), description: text("随机显示多件藏品的轮廓。", "Reveals several random item outlines.", "Zeigt mehrere zufaellige Objektumrisse.") },
  { id: "gold_counter", name: text("金品计数仪", "Gold Counter", "Goldzaehler"), description: text("显示仓库中全部金色品质藏品的数量。", "Reports the total number of gold-rarity items.", "Meldet die Gesamtzahl goldener Objekte.") },
  { id: "category_spectrometer", name: text("类型谱仪", "Category Spectrometer", "Kategorie-Spektrometer"), description: text("随机显示多件藏品的类别。", "Reveals the category of several random items.", "Zeigt die Kategorie mehrerer zufaelliger Objekte.") },
  { id: "value_estimator", name: text("均价测算仪", "Value Estimator", "Wertschaetzer"), description: text("给出整座仓库的私人价值区间。", "Produces a private estimated range for the full warehouse.", "Liefert einen privaten Schaetzbereich fuer das gesamte Lager.") }
];

export const auctionInstruments: InstrumentDefinition[] = auctionInstrumentDefinitions.map((entry) => ({
  ...entry,
  iconPath: assetPath("instruments", entry.id)
}));

export const allInstrumentIds = auctionInstruments.map((entry) => entry.id);

export function roleById(id: AuctionRoleId) {
  return auctionRoles.find((entry) => entry.id === id);
}

export function kitById(id: AuctionKitId) {
  return auctionKits.find((entry) => entry.id === id);
}

export function instrumentById(id: AuctionInstrumentId) {
  return auctionInstruments.find((entry) => entry.id === id);
}
