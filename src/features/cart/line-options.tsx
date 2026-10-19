'use client';

import type { CartQuoteLine } from '@/types';
import { cn } from '@lib/utils';

/**
 * Option chips for a cart line that was added without its size/colour (the
 * product card's quick "Add to cart"). Hidden once every option is chosen —
 * the line's variant text takes over then.
 */
export function LineOptions({
  options,
  value,
  onChange,
  className,
}: {
  options: CartQuoteLine['options'];
  value: Record<string, string>;
  onChange: (variant: Record<string, string>) => void;
  className?: string;
}) {
  const isChosen = (o: CartQuoteLine['options'][number]) => o.values.includes(value[o.name] ?? '');
  if (options.every(isChosen)) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {options.map((o) => (
        <fieldset key={o.name}>
          <legend className="type-caption text-muted mb-1">
            {o.name}
            {!isChosen(o) && (
              <span className="font-semibold text-[var(--status-danger-fg)]"> · choose one</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {o.values.map((val) => {
              const on = value[o.name] === val;
              return (
                <button
                  key={val}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, [o.name]: val })}
                  className={cn(
                    'focus-ring min-w-9 rounded-full border px-3 py-1 text-xs font-medium transition',
                    on
                      ? 'bg-noir border-noir text-white'
                      : 'border-line-2/70 text-ink hover:border-ink bg-white',
                  )}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
