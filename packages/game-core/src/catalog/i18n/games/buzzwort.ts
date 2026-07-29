// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const buzzwortText = {
  "zh-CN": {
    displayName: "禁词挑战",
    description: "限时解释目标词，但不能说出卡片上的禁用词；监督员会随时按铃。"
  },
  de: {
    displayName: "Buzzwort",
    description: "Erklaere Begriffe gegen die Uhr, ohne verbotene Woerter zu sagen; ein Waechter passt auf."
  },
  en: {
    displayName: "Buzzword",
    description: "Explain terms against the clock without saying the forbidden words while a watcher listens."
  }
} as const satisfies LocalizedGameTextMap;
