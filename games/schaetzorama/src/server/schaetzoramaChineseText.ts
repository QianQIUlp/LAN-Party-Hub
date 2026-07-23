import type { SchaetzoramaCategoryId } from "../protocol.js";
import type { SchaetzoramaEnglishQuestionText } from "./schaetzoramaContent.js";

export const schaetzoramaChineseQuestionIds: Record<SchaetzoramaCategoryId, readonly string[]> = {
  number: [
    "de-bundeslaender", "solar-system-planets", "adult-teeth", "si-base-units-count",
    "olympic-rings", "spider-legs", "standard-guitar-strings", "football-team-players",
    "carbon-atomic-number", "continents-count", "iau-constellations-count", "single-letter-element-symbols"
  ],
  percent: [
    "de-waldanteil", "earth-water-surface", "human-body-water", "dry-air-oxygen",
    "dry-air-nitrogen", "piano-black-keys-octave", "cucumber-water-percent",
    "earth-water-saltwater-percent", "visible-moon-surface-from-earth", "earth-crust-oxygen-mass",
    "quarter-millennium-percent", "vodka-eu-minimum-abv"
  ],
  rank: [
    "area-canada-china-brazil", "planet-diameter-jse", "body-elements", "si-prefixes",
    "olympics-chronology", "animal-running-speed", "food-ph-acidic-basic", "buildings-old-new",
    "ball-diameter-large-small", "ph-acid-neutral-basic", "mountains-height-high-low", "planet-density-rank"
  ],
  assign: [
    "eu-nato-overlap", "inner-outer-planets", "vitamins-solubility", "si-base-or-other",
    "summer-winter-sports", "mammal-or-reptile", "string-or-wind-instruments", "input-output-devices",
    "grain-or-legume", "greek-or-roman-gods", "board-or-card-games", "element-or-compound"
  ]
};

const number = (prompt: string): SchaetzoramaEnglishQuestionText => ({ title: "猜一个数字", shortLabel: "数字", prompt });
const percent = (prompt: string): SchaetzoramaEnglishQuestionText => ({ title: "猜百分比", shortLabel: "百分比", prompt });
const rank = (
  prompt: string,
  directionLabel: string,
  itemLabels: Record<string, string>
): SchaetzoramaEnglishQuestionText => ({ title: "排一排", shortLabel: "排序", prompt, directionLabel, itemLabels });
const assign = (
  prompt: string,
  leftLabel: string,
  rightLabel: string,
  termLabels: Record<string, string>
): SchaetzoramaEnglishQuestionText => ({ title: "分分类", shortLabel: "归类", prompt, leftLabel, rightLabel, termLabels });

export const schaetzoramaChineseTextByQuestionId: Record<string, SchaetzoramaEnglishQuestionText> = {
  "de-bundeslaender": number("德国由多少个联邦州组成？"),
  "solar-system-planets": number("按照当前分类，太阳系有多少颗行星？"),
  "adult-teeth": number("包含智齿时，完整的成年人恒牙共有多少颗？"),
  "si-base-units-count": number("国际单位制有多少个基本单位？"),
  "olympic-rings": number("奥林匹克标志由多少个相扣的圆环组成？"),
  "spider-legs": number("蜘蛛有多少条腿？"),
  "standard-guitar-strings": number("一把标准吉他通常有多少根弦？"),
  "football-team-players": number("一支足球队通常同时有多少名球员在场上？"),
  "carbon-atomic-number": number("碳元素的原子序数是多少？"),
  "continents-count": number("常用的七大洲模型把世界分为多少个洲？"),
  "iau-constellations-count": number("国际天文学联合会正式认可多少个星座？"),
  "single-letter-element-symbols": number("有多少种化学元素使用单个字母作为元素符号？"),

  "de-waldanteil": percent("德国国土中大约有百分之多少是森林？"),
  "earth-water-surface": percent("地球表面大约有百分之多少被水覆盖？"),
  "human-body-water": percent("成年人体重中大约有百分之多少是水？"),
  "dry-air-oxygen": percent("干燥空气中氧气大约占百分之多少？"),
  "dry-air-nitrogen": percent("干燥空气中氮气大约占百分之多少？"),
  "piano-black-keys-octave": percent("一个八度的 12 个半音中，黑色钢琴键约占百分之多少？"),
  "cucumber-water-percent": percent("黄瓜中大约有百分之多少是水？"),
  "earth-water-saltwater-percent": percent("地球上的水大约有百分之多少是咸水？"),
  "visible-moon-surface-from-earth": percent("从地球长期观测，最多大约能看到月球表面的百分之多少？"),
  "earth-crust-oxygen-mass": percent("按质量计算，地壳中大约有百分之多少是氧元素？"),
  "quarter-millennium-percent": percent("250 年占一个千年的百分之多少？"),
  "vodka-eu-minimum-abv": percent("欧盟规定伏特加的最低酒精度大约是多少？"),

  "area-canada-china-brazil": rank("按国土总面积从大到小排列。", "面积最大在前", { brazil: "巴西", canada: "加拿大", china: "中国" }),
  "planet-diameter-jse": rank("按行星直径从大到小排列。", "直径最大在前", { earth: "地球", jupiter: "木星", saturn: "土星" }),
  "body-elements": rank("按这些元素在人体中的质量占比从大到小排列。", "占比最大在前", { carbon: "碳", oxygen: "氧", hydrogen: "氢" }),
  "si-prefixes": rank("按数量级从小到大排列这些国际单位制前缀。", "从小到大", { kilo: "千（kilo）", mega: "兆（mega）", giga: "吉（giga）" }),
  "olympics-chronology": rank("按举办时间从早到晚排列这些现代夏季奥运会。", "最早在前", { "st-louis": "圣路易斯", athens: "雅典", paris: "巴黎" }),
  "animal-running-speed": rank("按典型最高奔跑速度从快到慢排列。", "最快在前", { cheetah: "猎豹", ostrich: "鸵鸟", elephant: "大象" }),
  "food-ph-acidic-basic": rank("按典型 pH 值从更酸到较不酸排列。", "更酸在前", { lemon: "柠檬汁", coffee: "咖啡", milk: "牛奶" }),
  "buildings-old-new": rank("按建造年代从早到晚排列。", "最古老在前", { giza: "吉萨金字塔", colosseum: "罗马斗兽场", eiffel: "埃菲尔铁塔" }),
  "ball-diameter-large-small": rank("按常见球体直径从大到小排列。", "直径最大在前", { basketball: "篮球", football: "足球", tennis: "网球" }),
  "ph-acid-neutral-basic": rank("按典型 pH 值从酸性到碱性排列。", "酸性在前", { vinegar: "食醋", water: "纯水", ammonia: "氨水" }),
  "mountains-height-high-low": rank("按海拔从高到低排列这些山峰。", "最高在前", { everest: "珠穆朗玛峰", kilimanjaro: "乞力马扎罗山", zugspitze: "楚格峰" }),
  "planet-density-rank": rank("按平均密度从高到低排列这些行星。", "密度最高在前", { earth: "地球", mercury: "水星", venus: "金星" }),

  "eu-nato-overlap": assign("把国家归入欧盟成员、北约成员或两者都是。", "欧盟", "北约", { germany: "德国", norway: "挪威", ireland: "爱尔兰", poland: "波兰", austria: "奥地利" }),
  "inner-outer-planets": assign("把行星分为内侧类地行星或外侧巨行星。", "内侧行星", "外侧行星", { mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", neptune: "海王星" }),
  "vitamins-solubility": assign("把维生素分为脂溶性或水溶性。", "脂溶性", "水溶性", { "vit-a": "维生素 A", "vit-c": "维生素 C", "vit-d": "维生素 D", "vit-k": "维生素 K", "vit-b12": "维生素 B12" }),
  "si-base-or-other": assign("把单位分为国际单位制基本单位或其他单位。", "SI 基本单位", "其他单位", { meter: "米", second: "秒", kelvin: "开尔文", liter: "升", hour: "小时" }),
  "summer-winter-sports": assign("把奥运项目分为夏季项目或冬季项目。", "夏季", "冬季", { athletics: "田径", swimming: "游泳", "alpine-skiing": "高山滑雪", "ice-hockey": "冰球", snowboard: "单板滑雪" }),
  "mammal-or-reptile": assign("把动物分为哺乳动物或爬行动物。", "哺乳动物", "爬行动物", { dolphin: "海豚", bat: "蝙蝠", whale: "鲸", crocodile: "鳄鱼", snake: "蛇" }),
  "string-or-wind-instruments": assign("把乐器分为弦乐器或管乐器。", "弦乐器", "管乐器", { violin: "小提琴", guitar: "吉他", harp: "竖琴", trumpet: "小号", flute: "长笛" }),
  "input-output-devices": assign("把设备分为输入设备或输出设备。", "输入", "输出", { keyboard: "键盘", mouse: "鼠标", scanner: "扫描仪", monitor: "显示器", printer: "打印机" }),
  "grain-or-legume": assign("把食物分为谷物或豆类。", "谷物", "豆类", { rice: "大米", wheat: "小麦", oats: "燕麦", lentil: "扁豆", chickpea: "鹰嘴豆" }),
  "greek-or-roman-gods": assign("把神祇分为希腊神话或罗马神话。", "希腊", "罗马", { zeus: "宙斯", athena: "雅典娜", aphrodite: "阿佛洛狄忒", jupiter: "朱庇特", mars: "玛尔斯" }),
  "board-or-card-games": assign("把游戏分为棋盘游戏或纸牌游戏。", "棋盘", "纸牌", { chess: "国际象棋", monopoly: "大富翁", go: "围棋", poker: "扑克", skat: "斯卡特牌" }),
  "element-or-compound": assign("把物质分为化学元素或化合物。", "元素", "化合物", { oxygen: "氧", carbon: "碳", water: "水", co2: "二氧化碳", salt: "氯化钠" })
};
