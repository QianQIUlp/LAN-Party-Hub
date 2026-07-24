import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const liarsTableText = {
  "zh-CN": {
    displayName: "谎言牌桌",
    description: "秘密出牌、公开宣称并决定何时质疑，成为最后留在牌桌上的玩家。"
  },
  en: {
    displayName: "Liars' Table",
    description: "Play in secret, claim in public, and challenge at the right moment."
  },
  de: {
    displayName: "Luegentisch",
    description: "Spiele geheim, sage offen an und zweifle im richtigen Moment."
  }
} as const satisfies LocalizedGameTextMap;
