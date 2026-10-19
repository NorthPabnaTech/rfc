/**
 * Global Number and Currency Formatting Utilities.
 * Uses Bangladesh/Indian-style comma grouping (`en-IN`):
 * 500       → 500
 * 1,000     → 1,000
 * 12,500    → 12,500
 * 1,30,000  → 1,30,000
 * 25,00,000 → 25,00,000
 */

/**
 * Format any numeric value using Bangladesh/Indian-style comma grouping.
 */
export function formatNumber(
  value: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return '0';

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(num);
}

/**
 * Format as BDT string without the ৳ symbol.
 * Example: `formatBDT(60000)` → `'BDT 60,000'`
 */
export function formatBDT(
  amount: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  return `BDT ${formatNumber(amount, options)}`;
}

/**
 * Global currency formatter (replacing ৳ with BDT standard).
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  return formatBDT(amount, options);
}

/** Compact number formatting, e.g. 1.2K, 3.4M. */
export function formatCompactNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/**
 * Format raw integer or numeric string with Bangladesh/Indian-style comma grouping.
 * Strips decimals and non-digits. Returns empty string if input is empty or invalid.
 * E.g. '1000' → '1,000', '130000' → '1,30,000', '2500000' → '25,00,000'
 */
export function formatIntegerEnIn(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (Number.isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(num);
}

/**
 * Parse a comma-formatted integer string into an unformatted numeric integer.
 * Returns undefined if blank or empty.
 */
export function parseIntegerEnIn(
  formatted: string | number | null | undefined,
): number | undefined {
  if (formatted === null || formatted === undefined || formatted === '') return undefined;
  if (typeof formatted === 'number') {
    return Number.isFinite(formatted) ? Math.trunc(formatted) : undefined;
  }
  const digits = String(formatted).replace(/\D/g, '');
  if (!digits) return undefined;
  const num = parseInt(digits, 10);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Calculate the new caret position in a formatted string
 * corresponding to the number of raw digits before the caret.
 * Guarantees that cursor does not jump when inserting or deleting in the middle of a formatted number.
 */
export function calculateCaretPosition(formattedValue: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) return 0;
  let digitCount = 0;
  for (let i = 0; i < formattedValue.length; i++) {
    const char = formattedValue[i];
    if (char && /\d/.test(char)) {
      digitCount++;
      if (digitCount === digitsBeforeCaret) {
        return i + 1;
      }
    }
  }
  return formattedValue.length;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n] ?? '';
  const tens = TENS[Math.floor(n / 10)] ?? '';
  const ones = ONES[n % 10] ?? '';
  return ones ? `${tens}-${ones}` : tens;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(' ');
}

/**
 * Spells an amount in English words using the Bangladeshi/Indian scale
 * (crore / lakh / thousand), e.g. 287500 → "Two Lakh Eighty-Seven Thousand
 * Five Hundred Taka Only". Paisa are included only when non-zero.
 */
export function formatAmountInWords(
  amount: number | string | null | undefined,
  options?: { currency?: string; suffix?: string },
): string {
  const currency = options?.currency ?? 'Taka';
  const suffix = options?.suffix ?? 'Only';

  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) return '—';

  const isNegative = numeric < 0;
  const absolute = Math.abs(numeric);
  const whole = Math.floor(absolute);
  const paisa = Math.round((absolute - whole) * 100);

  if (whole === 0 && paisa === 0) return `Zero ${currency} ${suffix}`.trim();

  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundred = whole % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  let words = parts.join(' ').trim();
  if (paisa) words += ` and ${twoDigitsToWords(paisa)} Paisa`;

  return `${isNegative ? 'Minus ' : ''}${words} ${currency} ${suffix}`.replace(/\s+/g, ' ').trim();
}
