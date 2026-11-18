const RECENT_ORDER_STORAGE_KEY = 'rfc_last_order';

interface RecentOrderRecord {
  orderNumber: string;
  phone: string;
}

/**
 * Remember the most recent checkout order number and phone in this browser tab
 * so `/track-order?order=...` can auto-fill the phone without exposing it in
 * public URLs or server-rendered order-confirmation HTML.
 */
export function saveRecentOrder(orderNumber: string, phone: string): void {
  try {
    const payload: RecentOrderRecord = {
      orderNumber: orderNumber.trim(),
      phone: phone.trim(),
    };
    window.sessionStorage.setItem(RECENT_ORDER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors (e.g. restricted browsing contexts).
  }
}

/** Return the saved phone for `orderNumber` if it matches the tab's recent checkout. */
export function getRecentOrderPhone(orderNumber: string): string | null {
  const normalized = orderNumber.trim().toUpperCase();
  if (!normalized) return null;
  try {
    const raw = window.sessionStorage.getItem(RECENT_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecentOrderRecord>;
    if (
      typeof parsed.orderNumber === 'string' &&
      parsed.orderNumber.trim().toUpperCase() === normalized &&
      typeof parsed.phone === 'string' &&
      parsed.phone.trim()
    ) {
      return parsed.phone.trim();
    }
    return null;
  } catch {
    return null;
  }
}
