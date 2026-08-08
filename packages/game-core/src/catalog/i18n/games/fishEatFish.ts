import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const fishEatFishText = {
  "zh-CN": {
    displayName: "大鱼吃小鱼",
    description: "手机摇杆控制小鱼，吃更小的鱼越长越大，90 秒后体型最大者获胜。"
  },
  de: {
    displayName: "Fisch frisst Fisch",
    description: "Steuere deinen Fisch mit dem Handy-Joystick, friss kleinere Fische, wachse an - der groesste Fisch nach 90 Sekunden gewinnt."
  },
  en: {
    displayName: "Fish Eat Fish",
    description: "Steer your fish with the phone joystick, eat smaller fish to grow - the biggest fish after 90 seconds wins."
  }
} as const satisfies LocalizedGameTextMap;
