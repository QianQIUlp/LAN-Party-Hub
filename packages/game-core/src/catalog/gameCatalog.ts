// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { GameManifest } from "../types/GameManifest.js";
import { defaultLanguage, normalizeLanguage, type SupportedLanguage } from "../i18n/language.js";
import { gameTextById } from "./i18n/gameTexts.js";

export const gameCatalog: readonly GameManifest[] = [];

export function listGameCatalog(): GameManifest[] {
  return [...gameCatalog];
}

export function getGameManifest(gameId: string): GameManifest | undefined {
  return gameCatalog.find((entry) => entry.id === gameId);
}

export function localizeGameManifest(
  manifest: GameManifest,
  language: SupportedLanguage = defaultLanguage
): GameManifest {
  const texts = gameTextById[manifest.id];
  const text = texts?.[normalizeLanguage(language)] ?? texts?.en ?? texts?.de;

  if (!text) {
    return manifest;
  }

  const localizedLobbySetup = manifest.lobbySetup && text.lobbySetup
    ? {
        ...manifest.lobbySetup,
        title: text.lobbySetup.title ?? manifest.lobbySetup.title,
        description: text.lobbySetup.description ?? manifest.lobbySetup.description,
        fields: manifest.lobbySetup.fields.map((field) => {
          const localizedField = text.lobbySetup?.fields?.[field.id];
          return {
            ...field,
            label: localizedField?.label ?? field.label,
            description: localizedField?.description ?? field.description,
            ...(field.kind === "select"
              ? {
                  options: field.options.map((option) => ({
                    ...option,
                    label: localizedField?.options?.[option.id]?.label ?? option.label,
                    description: localizedField?.options?.[option.id]?.description ?? option.description
                  }))
                }
              : {})
          };
        }),
        confirmation: manifest.lobbySetup.confirmation
          ? {
              ...manifest.lobbySetup.confirmation,
              label: text.lobbySetup.confirmation?.label ?? manifest.lobbySetup.confirmation.label,
              description: text.lobbySetup.confirmation?.description ?? manifest.lobbySetup.confirmation.description
            }
          : undefined
      }
    : manifest.lobbySetup;

  return {
    ...manifest,
    displayName: text.displayName,
    description: text.description,
    lobbySetup: localizedLobbySetup
  };
}

export function listLocalizedGameCatalog(
  language: SupportedLanguage = defaultLanguage
): GameManifest[] {
  return gameCatalog.map((entry) => localizeGameManifest(entry, language));
}
