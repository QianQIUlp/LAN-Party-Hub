import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const tapRaceText = {
  "zh-CN": {
    displayName: "疯狂点击",
    description: "在手机上快速点击，抢先冲过终点。"
  },
  de: {
    displayName: "Tap Race",
    description: "Tippe schneller als die anderen bis zum Ziel."
  },
  en: {
    displayName: "Tap Race",
    description: "Tap faster than everyone else to reach the finish."
  }
} as const satisfies LocalizedGameTextMap;
