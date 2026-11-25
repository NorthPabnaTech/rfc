'use client';

import { useI18n } from '@/i18n/provider';
import type { Order, OrderStatus } from '@/types/platform';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { ORDER_PIPELINE } from '@lib/business/orders';
import { cn } from '@lib/utils';

const ICON: Record<OrderStatus, IconRegistryKey> = {
  placed: 'cart',
  processing: 'processing',
  confirmed: 'badgeCheck',
  shipped: 'shipping',
  out_for_delivery: 'truck',
  delivered: 'delivered',
  cancelled: 'cancelCircle',
  returned: 'refresh',
};

/**
 * Vertical tracking timeline. The happy path is always shown; reached steps
 * carry their timestamp. A cancelled/returned order ends with that red step.
 */
export function OrderTimeline({ order, compact }: { order: Order; compact?: boolean }) {
  const { t, dateTime } = useI18n();
  const reached = new Map(order.history.map((h) => [h.status, h]));
  const terminal =
    order.status === 'cancelled' || order.status === 'returned' ? order.status : null;
  const steps: OrderStatus[] = terminal
    ? [...ORDER_PIPELINE.filter((s) => reached.has(s)), terminal]
    : ORDER_PIPELINE;
  const currentIdx = steps.indexOf(order.status);

  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const ev = reached.get(step);
        const done = i <= currentIdx;
        const current = i === currentIdx;
        const bad = step === 'cancelled' || step === 'returned';
        return (
          <li
            key={step}
            className={cn(
              'relative flex gap-4',
              i < steps.length - 1 && (compact ? 'pb-5' : 'pb-7'),
            )}
          >
            {i < steps.length - 1 && (
              <span
                className={cn(
                  'absolute top-9 left-[17px] h-[calc(100%-2.25rem)] w-0.5 rounded-full',
                  i < currentIdx ? 'bg-brand-500' : 'bg-line-2/60',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-9 shrink-0 place-items-center rounded-full transition-colors',
                bad && done
                  ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]'
                  : done
                    ? 'bg-brand-500 text-white'
                    : 'bg-well text-subtle',
                current && !bad && 'ring-brand-500/25 ring-4',
              )}
            >
              <Icon name={ICON[step]} size={17} />
            </span>
            <div className="min-w-0 pt-1.5">
              <p className={cn('text-[13.5px] font-semibold', done ? 'text-ink' : 'text-subtle')}>
                {t(`status.order.${step}`)}
              </p>
              {ev ? (
                <p className="text-muted num mt-0.5 text-xs">{dateTime(ev.at)}</p>
              ) : (
                <p className="text-subtle mt-0.5 text-xs">—</p>
              )}
              {ev?.note && <p className="text-muted mt-1 text-xs italic">“{ev.note}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact horizontal progress for list cards. */
export function OrderProgress({ order }: { order: Order }) {
  const idx = ORDER_PIPELINE.indexOf(order.status);
  const bad = order.status === 'cancelled' || order.status === 'returned';
  return (
    <div className="flex gap-1" aria-hidden>
      {ORDER_PIPELINE.map((s, i) => (
        <span
          key={s}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            bad ? 'bg-[var(--status-danger-bg)]' : i <= idx ? 'bg-brand-500' : 'bg-well',
          )}
        />
      ))}
    </div>
  );
}
