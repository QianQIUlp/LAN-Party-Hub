// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { SupportedLanguage } from "./language.js";

export type LocalizedTextMap<T> = Partial<Record<SupportedLanguage, T>> & {
  de: T;
  en: T;
};

export interface LocalizedGameText {
  displayName: string;
  description: string;
  lobbySetup?: {
    title?: string;
    description?: string;
    fields?: Record<string, {
      label?: string;
      description?: string;
      options?: Record<string, { label?: string; description?: string }>;
    }>;
    confirmation?: { label?: string; description?: string };
  };
}

export type LocalizedGameTextMap = LocalizedTextMap<LocalizedGameText>;
