'use client';

import { useI18n } from '@/i18n/provider';
import type { OrderStatus } from '@/types/platform';

/** Locale-aware formatters for chart axes and tooltips. */
export function useChartFormat() {
  const i18n = useI18n();
  return {
    money: (v: number) => i18n.money(v),
    moneyTick: (v: number) => i18n.money(v, { compact: true }),
    count: (v: number) => i18n.num(v),
    /** For month points keyed "YYYY-M". */
    monthLabel: (key: string) => {
      const [y, m] = key.split('-').map(Number);
      return i18n.month(m!, y!);
    },
    dayLabel: (iso: string) => i18n.shortDate(iso),
  };
}

/** Colour per order status for BarList rows (status tokens, not series colours). */
export const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: 'var(--color-subtle)',
  processing: 'var(--status-warn-dot)',
  confirmed: 'var(--status-info-dot)',
  shipped: 'var(--color-brand-500)',
  out_for_delivery: '#8b5cf6',
  delivered: 'var(--status-ok-dot)',
  cancelled: 'var(--status-danger-dot)',
  returned: '#e2557a',
};
