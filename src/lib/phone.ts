const BANGLA_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/** Converts Bangla numerals (`০-৯`) to ASCII (`0-9`). */
export function normalizeBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] ?? d);
}

/**
 * Normalizes Bangladeshi phone numbers into `01XXXXXXXXX` format.
 * Handles `+8801XXXXXXXXX`, `8801XXXXXXXXX`, `01XXXXXXXXX`, spaces, dashes,
 * parentheses, and Bangla digits. Returns `null` if invalid.
 */
export function normalizeBDPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const ascii = normalizeBanglaDigits(raw).replace(/[\s\-()]/g, '');
  let digits = ascii.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('880') && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith('88') && digits.length === 13 && digits.startsWith('880')) {
    digits = `0${digits.slice(3)}`;
  }
  if (!/^01[3-9]\d{8}$/.test(digits)) return null;
  return digits;
}
