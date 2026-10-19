'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

/** Free-text tags: type and press Enter or comma to add; Backspace removes the last. */
export function ChipInput({
  value,
  onChange,
  placeholder = 'Type and press Enter',
  max = 50,
  id,
  'aria-invalid': invalid,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
  id?: string;
  'aria-invalid'?: boolean;
}) {
  const [draft, setDraft] = React.useState('');

  const commit = () => {
    const parts = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.includes(s));
    if (parts.length) onChange([...value, ...parts].slice(0, max));
    setDraft('');
  };

  return (
    <div
      className={cn(
        'input-flat flex min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5',
        invalid && 'border-[var(--status-danger-fg)]',
      )}
    >
      {value.map((v) => (
        <span
          key={v}
          className="bg-well text-ink inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-[12.5px]"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="text-subtle hover:text-ink rounded p-0.5"
          >
            <Icon name="x" size={11} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? '' : placeholder}
        className="text-ink placeholder:text-subtle min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none"
      />
    </div>
  );
}

/** Pick several options from a fixed list, shown as toggle chips. */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  emptyText = 'No options yet',
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  emptyText?: string;
}) {
  if (options.length === 0) return <p className="text-subtle text-[12.5px]">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] font-medium transition',
              on
                ? 'bg-noir border-noir text-white'
                : 'border-line-2/70 text-ink hover:border-ink bg-white',
            )}
          >
            {on && <Icon name="check" size={12} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
