'use client';

import { useI18n } from '@/i18n/provider';
import type { PaymentMethod } from '@/types/platform';
import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

const BRAND: Record<PaymentMethod, { bg: string; fg: string; letter: string }> = {
  bkash: { bg: '#e2136e', fg: '#fff', letter: 'b' },
  nagad: { bg: '#f6921e', fg: '#fff', letter: 'N' },
  rocket: { bg: '#8c3494', fg: '#fff', letter: 'R' },
  bank: { bg: '#023047', fg: '#fff', letter: '' },
};

const LOGO_SRC: Partial<Record<PaymentMethod, string>> = {
  bkash: '/brand/bkash_logo.webp',
  nagad: '/brand/nagad_logo.png',
};

function MethodLogo({ method }: { method: PaymentMethod }) {
  const src = LOGO_SRC[method];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={method} className="size-8 object-contain" />
    );
  }
  if (method === 'rocket') return <span className="text-base font-black">R</span>;
  return <Icon name="bank" size={20} />;
}

/** Payment / payout method cards. */
export function MethodPicker({
  value,
  onChange,
  methods = ['bkash', 'nagad', 'rocket', 'bank'],
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  methods?: PaymentMethod[];
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        'grid gap-2.5',
        methods.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
      )}
      role="radiogroup"
      aria-label={t('seller.wallet.method')}
    >
      {methods.map((m) => {
        const active = value === m;
        const b = BRAND[m];
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={cn(
              'focus-ring bg-panel relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors',
              active ? 'border-brand ring-brand ring-1' : 'border-line hover:border-line-2',
            )}
          >
            <span
              className="grid size-10 place-items-center overflow-hidden rounded-xl text-base font-black"
              style={LOGO_SRC[m] ? { background: '#ffffff' } : { background: b.bg, color: b.fg }}
            >
              <MethodLogo method={m} />
            </span>
            <span className="text-ink text-[13px] font-semibold">{t(`payment.${m}`)}</span>
            {active && (
              <Icon name="checkCircle" size={16} className="text-accent absolute top-2 right-2" />
            )}
          </button>
        );
      })}
    </div>
  );
}
