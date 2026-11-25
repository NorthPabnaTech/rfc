import { INTL_LOCALE, type Locale } from './config';

/*
 * Locale-aware formatting. English uses Latin digits; Bangla uses Bangla
 * digits (০-৯) via Intl 'bn-BD'. All dates render in Dhaka time.
 */

const TZ = 'Asia/Dhaka';
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function nf(locale: Locale, opts: Intl.NumberFormatOptions = {}) {
  const key = `n|${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Intl.NumberFormat | undefined;
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[locale], opts);
    cache.set(key, f);
  }
  return f;
}

function df(locale: Locale, opts: Intl.DateTimeFormatOptions) {
  const key = `d|${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) {
    f = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: TZ, ...opts });
    cache.set(key, f);
  }
  return f;
}

export function formatNumber(n: number, locale: Locale, opts?: Intl.NumberFormatOptions) {
  return nf(locale, { maximumFractionDigits: 0, ...opts }).format(n);
}

/** ৳1,250 / ৳১,২৫০ — whole Taka; negative amounts render as −৳50. */
export function formatMoney(
  n: number,
  locale: Locale,
  opts?: { signed?: boolean; compact?: boolean },
) {
  const abs = Math.abs(n);
  const body = opts?.compact
    ? nf(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(abs)
    : nf(locale, { maximumFractionDigits: 0 }).format(abs);
  const sign = n < 0 ? '−' : opts?.signed && n > 0 ? '+' : '';
  return `${sign}৳${body}`;
}

export function formatPercent(n: number, locale: Locale) {
  return `${nf(locale, { maximumFractionDigits: 1 }).format(n)}%`;
}

export function formatDate(iso: string | number | Date, locale: Locale) {
  return df(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function formatDateTime(iso: string | number | Date, locale: Locale) {
  return df(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string | number | Date, locale: Locale) {
  return df(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export function formatShortDate(iso: string | number | Date, locale: Locale) {
  return df(locale, { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function formatMonth(month: number, year: number, locale: Locale) {
  return df(locale, { month: 'short' }).format(new Date(year, month, 15));
}

export function formatRelative(iso: string | number | Date, locale: Locale, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
  const abs = Math.abs(diff);
  const min = 60_000;
  if (abs < min) return rtf.format(0, 'second');
  if (abs < 60 * min) return rtf.format(Math.round(diff / min), 'minute');
  if (abs < 24 * 60 * min) return rtf.format(Math.round(diff / (60 * min)), 'hour');
  if (abs < 30 * 24 * 60 * min) return rtf.format(Math.round(diff / (24 * 60 * min)), 'day');
  return formatDate(iso, locale);
}

/** Duration like "1d 4h" / "১দি ৪ঘ" for countdowns. */
export function formatDuration(ms: number, locale: Locale) {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const n = (x: number) => formatNumber(x, locale);
  const u = locale === 'bn' ? { d: 'দিন', h: 'ঘণ্টা', m: 'মিনিট' } : { d: 'd', h: 'h', m: 'm' };
  const sp = locale === 'bn' ? ' ' : '';
  if (d > 0) return `${n(d)}${sp}${u.d} ${n(h % 24)}${sp}${u.h}`;
  if (h > 0) return `${n(h)}${sp}${u.h} ${n(m)}${sp}${u.m}`;
  return `${n(m)}${sp}${u.m}`;
}
