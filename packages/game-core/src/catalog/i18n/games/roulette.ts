import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const rouletteText = {
  "zh-CN": {
    displayName: "命运轮盘",
    description: "在隐藏弹序中选择朝自己或对手扣动扳机，活到最后。"
  },
  en: {
    displayName: "Fate Chamber",
    description: "Read the hidden chamber, choose your target, and be the last one standing."
  },
  de: {
    displayName: "Schicksalstrommel",
    description: "Lies die verborgene Trommel, waehle dein Ziel und bleibe als Letzter uebrig."
  }
} as const satisfies LocalizedGameTextMap;
