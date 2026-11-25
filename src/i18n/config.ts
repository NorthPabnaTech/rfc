export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';

export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', bn: 'বাংলা' };

/** Intl locale per UI language — bn-BD gives Bangla digits and lakh grouping. */
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-IN', bn: 'bn-BD' };

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}
