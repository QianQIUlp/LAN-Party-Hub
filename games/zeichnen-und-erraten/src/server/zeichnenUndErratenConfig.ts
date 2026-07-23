// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type {
  ZeichnenUndErratenLobbyState,
  ZeichnenUndErratenWordCategory
} from "../protocol.js";
import type { SupportedLanguage } from "@open-party-lab/game-core";

export const zeichnenUndErratenRoomSettingKeys = {
  wordCategory: "zeichnenUndErratenWordCategory"
} as const;

const defaultWordCategory: ZeichnenUndErratenWordCategory = "standard";

export function isZeichnenUndErratenWordCategory(
  value: unknown
): value is ZeichnenUndErratenWordCategory {
  return value === "standard" || value === "adult" || value === "all";
}

export function resolveZeichnenUndErratenWordCategory(
  settings: Readonly<Record<string, unknown>>
): ZeichnenUndErratenWordCategory {
  const value = settings[zeichnenUndErratenRoomSettingKeys.wordCategory];
  return isZeichnenUndErratenWordCategory(value) ? value : defaultWordCategory;
}

export function getZeichnenUndErratenLobbyState(
  settings: Readonly<Record<string, unknown>>,
  language: SupportedLanguage
): ZeichnenUndErratenLobbyState {
  const zh = language === "zh-CN";
  const en = language === "en";

  return {
    selectedCategory: resolveZeichnenUndErratenWordCategory(settings),
    categories: [
      {
        id: "standard",
        label: zh ? "全年龄" : "U18",
        description: zh ? "适合所有人的轻松日常词语。" : en ? "Friendly drawing words for every group." : "Familienfreundliche Zeichenbegriffe."
      },
      {
        id: "adult",
        label: zh ? "成人" : en ? "18+" : "\u00dc18",
        description: zh ? "仅适合成年人聚会的词语。" : en ? "Mature party words for adults." : "Erwachsene Party-Begriffe."
      },
      {
        id: "all",
        label: zh ? "混合" : en ? "All" : "Alle",
        description: zh ? "同时使用全年龄和成人词库。" : en ? "Use both family and mature word lists." : "U18- und \u00dc18-Begriffe zusammen."
      }
    ]
  };
}
