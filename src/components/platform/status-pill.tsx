'use client';

import { useI18n } from '@/i18n/provider';
import type {
  Availability,
  OrderStatus,
  ProductStatus,
  SellerStatus,
  TicketStatus,
  TransactionStatus,
  WithdrawalStatus,
} from '@/types/platform';
import { cn } from '@lib/utils';

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'brand' | 'violet';

const TONES: Record<Tone, string> = {
  ok: 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]',
  warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn-fg)]',
  danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
  neutral: 'bg-well text-muted',
  brand: 'bg-brand-soft text-brand-ink',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
};

const ORDER_TONE: Record<string, Tone> = {
  pending: 'warn',
  placed: 'neutral',
  processing: 'warn',
  confirmed: 'info',
  shipped: 'brand',
  out_for_delivery: 'violet',
  delivered: 'ok',
  cancelled: 'danger',
  returned: 'danger',
};

const MAP = {
  order: ORDER_TONE,
  seller: { active: 'ok', pending: 'warn', inactive: 'neutral', suspended: 'danger' } as Record<
    SellerStatus,
    Tone
  >,
  withdrawal: { pending: 'warn', approved: 'info', rejected: 'danger', completed: 'ok' } as Record<
    WithdrawalStatus,
    Tone
  >,
  tx: { completed: 'ok', pending: 'warn', failed: 'danger' } as Record<TransactionStatus, Tone>,
  product: { active: 'ok', draft: 'neutral', out_of_stock: 'danger' } as Record<
    ProductStatus,
    Tone
  >,
  availability: { in_stock: 'ok', limited: 'warn', out_of_stock: 'danger' } as Record<
    Availability,
    Tone
  >,
  supplier: { active: 'ok', inactive: 'neutral' } as Record<string, Tone>,
  ticket: { open: 'warn', in_progress: 'info', resolved: 'ok' } as Record<TicketStatus, Tone>,
  priority: { low: 'neutral', normal: 'info', high: 'danger' } as Record<string, Tone>,
  earning: { pending: 'warn', released: 'ok' } as Record<string, Tone>,
  deposit: { pending: 'warn', completed: 'ok', failed: 'danger' } as Record<string, Tone>,
};

export type PillKind = keyof typeof MAP;

/** A translated status badge with a leading dot. */
export function StatusPill({
  kind,
  value,
  className,
}: {
  kind: PillKind;
  value: string;
  className?: string;
}) {
  const { tx } = useI18n();
  const tone = (MAP[kind] as Record<string, Tone>)[value] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {tx(`status.${kind}.${value}`)}
    </span>
  );
}

export function orderTone(s: OrderStatus): Tone {
  return ORDER_TONE[s] ?? 'neutral';
}
