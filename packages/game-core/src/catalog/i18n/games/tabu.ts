// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const tabuText = {
  "zh-CN": {
    displayName: "禁词挑战（旧版）",
    description: "旧版兼容游戏：解释目标词，但不能说出禁用词。"
  },
  de: {
    displayName: "Tabu",
    description: "Erklaert Begriffe, ohne die Tabu-Woerter zu benutzen."
  },
  en: {
    displayName: "Taboo",
    description: "Explain terms without using the forbidden words."
  }
} as const satisfies LocalizedGameTextMap;
