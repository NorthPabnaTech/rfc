'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { cn } from '@lib/utils';

type Props = {
  /** Filter rows — ideally `<FilterField>`s wrapping a control. */
  children: React.ReactNode;
  /** Count of active (non-default) filters — shows a badge + enables Clear. */
  count?: number;
  /** Reset all filters back to their defaults. */
  onReset?: () => void;
  /** Dropdown heading. Default `Filters`. */
  title?: string;
  className?: string;
};

/**
 * FilterDropdown — a "Filters" button that opens the filter controls in a clean
 * dropdown panel (Popover). Keeps the toolbar compact no matter how many filters
 * a screen has; the button carries an active-count badge. Search and the primary
 * action stay outside so they remain visible.
 *
 *   <FilterDropdown count={activeCount} onReset={() => onFilter(INITIAL_FILTERS)}>
 *     <FilterField label="Supplier"><FilterSelect … /></FilterField>
 *     <FilterField label="Status"><FilterSelect … /></FilterField>
 *   </FilterDropdown>
 */
export function FilterDropdown({
  children,
  count = 0,
  onReset,
  title = 'Filters',
  className,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between bg-white hover:bg-white active:scale-100 sm:w-auto sm:justify-center',
            className,
          )}
          aria-label="Open filters"
        >
          <span className="flex items-center gap-2">
            <Icon name="filter" size={15} />
            {title}
          </span>

          <span
            className={cn(
              'ml-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold',
              count ? 'bg-brand text-brand-contrast' : 'bg-well text-ink',
            )}
          >
            {count || 0}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        // Keep the panel open while interacting with a nested control's popper
        // (the FilterSelect dropdowns portal outside this content).
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest('[data-radix-popper-content-wrapper]')) e.preventDefault();
        }}
        className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden p-0 sm:w-80"
      >
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <p className="text-ink text-[13px] font-semibold">{title}</p>
          {count > 0 && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-accent hover:text-accent-hover focus-ring rounded text-[12px] font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid gap-3.5 p-4 [&>*]:w-full!">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * FilterField — a labelled row inside `FilterDropdown`. The control fills the
 * panel width regardless of its toolbar-sized default.
 */
export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-muted text-[12px] font-medium">{label}</span>
      <div className="[&>*]:w-full!">{children}</div>
    </div>
  );
}
