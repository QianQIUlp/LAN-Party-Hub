// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { LocalizedGameTextMap } from "../../../i18n/text.js";

export const imposterText = {
  "zh-CN": {
    displayName: "谁是卧底",
    description: "根据轮流给出的提示找出不知道秘密词的卧底。",
    lobbySetup: {
      title: "词库范围",
      description: "默认使用全年龄词库，成人词库需要主机主动选择。",
      fields: {
        "content-pack": {
          label: "词库",
          options: {
            standard: { label: "全年龄", description: "适合所有人的日常词语。" },
            adult: { label: "成人", description: "仅适合成年人聚会。" },
            all: { label: "混合", description: "同时使用两类词库。" }
          }
        }
      }
    }
  },
  de: {
    displayName: "Imposter",
    description: "Finde den Bluffenden durch Hinweise und Abstimmung.",
    lobbySetup: {
      title: "Wortpaket",
      description: "Das Standardpaket ist familientauglich; Erwachsene-Inhalte muessen bewusst gewaehlt werden.",
      fields: {
        "content-pack": {
          label: "Inhalt",
          options: {
            standard: { label: "Familie", description: "Alltaegliche Begriffe fuer alle." },
            adult: { label: "Erwachsene", description: "Nur fuer eine Erwachsenenrunde." },
            all: { label: "Gemischt", description: "Beide Pakete verwenden." }
          }
        }
      }
    }
  },
  en: {
    displayName: "Imposter",
    description: "Find the bluffing player through clues and a vote.",
    lobbySetup: {
      title: "Word pack",
      description: "Family content is the default; adult content must be selected explicitly.",
      fields: {
        "content-pack": {
          label: "Content",
          options: {
            standard: { label: "Family", description: "Everyday words suitable for everyone." },
            adult: { label: "Adult", description: "Only for an adults-only gathering." },
            all: { label: "Mixed", description: "Use both content packs." }
          }
        }
      }
    }
  }
} as const satisfies LocalizedGameTextMap;
