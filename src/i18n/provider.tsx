'use client';

import * as React from 'react';

import { type Locale, LOCALE_COOKIE } from './config';
import { bn } from './dictionaries/bn';
import { type Dictionary, en } from './dictionaries/en';
import * as f from './format';

/* ─────────────────────────────────────────────────────────────────────────
 * Centralised translations.
 *
 *   const { t, money, date, locale, setLocale } = useI18n();
 *   t('nav.dashboard')                      → "Dashboard" / "ড্যাশবোর্ড"
 *   t('wallet.minAdd', { amount: money(100) })
 *
 * The locale lives in a cookie so the server renders the same language as the
 * client (root layout reads it), and `<html lang>` follows it, which switches
 * fonts (Hind Siliguri / Anek Bangla numerals) via CSS.
 * ──────────────────────────────────────────────────────────────────────── */

const DICTS: Record<Locale, Dictionary> = { en, bn };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K & string : Join<K & string, Paths<T[K]>>;
}[keyof T];

export type TKey = Paths<Dictionary>;
export type TVars = Record<string, string | number>;

function lookup(dict: Dictionary, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in cur) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(s: string, vars?: TVars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function buildApi(locale: Locale) {
  const dict = DICTS[locale];
  const t = (key: TKey, vars?: TVars) =>
    interpolate(lookup(dict, key) ?? lookup(en, key) ?? key, vars);
  /** Translate a key that is built at runtime (e.g. `status.${s}`); falls back to the raw value. */
  const tx = (key: string, vars?: TVars) =>
    interpolate(lookup(dict, key) ?? lookup(en, key) ?? key.split('.').pop() ?? key, vars);
  return {
    locale,
    t,
    tx,
    num: (n: number, o?: Intl.NumberFormatOptions) => f.formatNumber(n, locale, o),
    money: (n: number, o?: { signed?: boolean; compact?: boolean }) => f.formatMoney(n, locale, o),
    percent: (n: number) => f.formatPercent(n, locale),
    date: (d: string | number | Date) => f.formatDate(d, locale),
    dateTime: (d: string | number | Date) => f.formatDateTime(d, locale),
    time: (d: string | number | Date) => f.formatTime(d, locale),
    shortDate: (d: string | number | Date) => f.formatShortDate(d, locale),
    month: (m: number, y: number) => f.formatMonth(m, y, locale),
    relative: (d: string | number | Date) => f.formatRelative(d, locale),
    duration: (ms: number) => f.formatDuration(ms, locale),
  };
}

export type I18n = ReturnType<typeof buildApi> & { setLocale: (l: Locale) => void };

const I18nContext = React.createContext<I18n | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = React.useMemo(() => ({ ...buildApi(locale), setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
