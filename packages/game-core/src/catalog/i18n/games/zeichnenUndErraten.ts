// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const zeichnenUndErratenText = {
  "zh-CN": {
    displayName: "你画我猜",
    description: "一名玩家在手机上作画，其他人争先猜出答案。",
    lobbySetup: {
      title: "词库范围",
      description: "选择本局可能出现的词语类型。",
      fields: {
        category: {
          label: "词库",
          options: {
            standard: { label: "全年龄", description: "默认的轻松日常词语。" },
            adult: { label: "成人", description: "仅适合成年人聚会的词语。" },
            all: { label: "混合", description: "同时使用全年龄和成人词库。" }
          }
        }
      }
    }
  },
  de: {
    displayName: "Zeichnen & Erraten",
    description: "Eine Person zeichnet auf dem Handy, alle anderen raten das Wort.",
    lobbySetup: {
      title: "Wortauswahl",
      description: "Waehle, welche Begriffe in dieser Runde vorkommen duerfen.",
      fields: {
        category: {
          label: "Wortpaket",
          options: {
            standard: { label: "Familie", description: "Leichte Alltagsbegriffe fuer alle." },
            adult: { label: "Erwachsene", description: "Nur fuer eine Erwachsenenrunde." },
            all: { label: "Gemischt", description: "Beide Wortpakete verwenden." }
          }
        }
      }
    }
  },
  en: {
    displayName: "Draw & Guess",
    description: "One player draws on the phone while everyone else guesses the word.",
    lobbySetup: {
      title: "Word selection",
      description: "Choose which kind of words may appear in this round.",
      fields: {
        category: {
          label: "Word pack",
          options: {
            standard: { label: "Family", description: "Easy everyday words for everyone." },
            adult: { label: "Adult", description: "Only for an adults-only gathering." },
            all: { label: "Mixed", description: "Use both word packs." }
          }
        }
      }
    }
  }
} as const satisfies LocalizedGameTextMap;
