// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const schaetzoramaText = {
  "zh-CN": {
    displayName: "估个大概",
    description: "估数字、排顺序、做归类，在轻松问答中比谁更接近真相。"
  },
  de: {
    displayName: "Schaetzorama",
    description: "Schaetzen, sortieren und abschreiben auf einer quietschbunten Quiz-Konsole."
  },
  en: {
    displayName: "Schaetzorama",
    description: "Estimate, sort and copy facts on a bright quiz console."
  }
} as const satisfies LocalizedGameTextMap;
