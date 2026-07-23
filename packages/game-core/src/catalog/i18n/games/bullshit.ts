import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const bullshitText = {
  "zh-CN": {
    displayName: "吹牛牌",
    description: "背面出牌、真假混杂；跟牌、质疑，或者把风险传给下一位。"
  },
  de: {
    displayName: "Bullshit",
    description: "Lege Karten verdeckt, bluffe und pruefe immer nur den letzten Zug."
  },
  en: {
    displayName: "Bullshit",
    description: "Play face down, bluff freely, and challenge only the most recent play."
  }
} as const satisfies LocalizedGameTextMap;
