// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
export const supportedLanguages = ["zh-CN", "en", "de"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultLanguage: SupportedLanguage = "zh-CN";

export const languageLabels: Record<SupportedLanguage, string> = {
  "zh-CN": "简体中文",
  de: "Deutsch",
  en: "English"
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && supportedLanguages.includes(value as SupportedLanguage);
}

export function normalizeLanguage(
  value: unknown,
  fallback: SupportedLanguage = defaultLanguage
): SupportedLanguage {
  return isSupportedLanguage(value) ? value : fallback;
}
