'use client';

import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * SearchInput — the standard list-toolbar search box (icon + input + clear).
 * Defaults to a constrained width so it doesn't sprawl across the whole row
 * when it's the only control; pass `className` (e.g. `flex-1`) to override.
 * ──────────────────────────────────────────────────────────────────────── */

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <div
      className={cn(
        'input-flat group flex h-10 w-72 max-w-full items-center gap-2 px-3',
        className,
      )}
    >
      <Icon name="search" size={16} className="text-subtle shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="text-ink placeholder:text-subtle h-full w-full bg-transparent text-sm outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="text-subtle hover:text-ink shrink-0 rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}
