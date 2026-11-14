/**
 * Normalizes a WhatsApp contact number into international digits-only format
 * required by https://wa.me/<number>. Defaults local BD numbers (01XXXXXXXXX)
 * to country code 88.
 */
export function normalizeWhatsAppNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 7) return null;
  if (digits.startsWith('01') && digits.length === 11) {
    return `88${digits}`;
  }
  return digits;
}

export function buildProductWhatsAppMessage(productName: string, productUrl: string): string {
  return [
    'Hello, I am interested in this product.',
    '',
    `Product Name: ${productName}`,
    '',
    `Product Link: ${productUrl}`,
    '',
    'Could you please provide more information?',
  ].join('\n');
}

export function buildGeneralWhatsAppMessage(
  defaultMessage: string | undefined,
  pageUrl?: string,
): string {
  const base =
    defaultMessage?.trim() ||
    'Hello, I visited your website and would like to know more about your products and services.';
  return pageUrl ? `${base}\n\nWebsite: ${pageUrl}` : base;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
