'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@components/ui/command';
import { FIELD_HEIGHT, FIELD_TEXT, type FieldSize } from '@components/ui/field-size';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Select — a prop-driven combobox (shadcn Combobox pattern: Popover + Command).
 * Pass your options as `items`; no compound JSX needed:
 *
 *   <Select
 *     items={roles.map((r) => ({ label: r.name, value: r.id }))}
 *     value={roleId}
 *     onValueChange={setRoleId}
 *     placeholder="Select a role"
 *     showSearch
 *   />
 *
 * Built on Popover (non-modal) so opening it never locks or shifts the page.
 * ──────────────────────────────────────────────────────────────────────── */

export type SelectOption = {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
  /** Optional leading icon for the option (and the trigger when selected). */
  icon?: IconRegistryKey;
};

export type SelectProps = {
  /** The options to render. */
  items: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: React.ReactNode;
  /** Show a search box to filter options. */
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Message when search matches nothing. */
  emptyText?: string;
  disabled?: boolean;
  /** Classes for the trigger button. */
  className?: string;
  /** Classes for the dropdown panel. */
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  /** Render a hidden input so the value submits inside a <form>. */
  name?: string;
  id?: string;
  /** Control size — defaults to the system `lg`. */
  size?: FieldSize;
  'aria-label'?: string;
  /** Set by `FormItem` when the field fails validation — paints the error border. */
  'aria-invalid'?: boolean;
  /** Id of the field's message element, for screen readers. */
  'aria-describedby'?: string;
  /** Show a clear icon on hover when a non-default value is selected. */
  clearable?: boolean;
  /** Callback fired when the clear icon is clicked. Defaults to selecting 'all' or ''. */
  onClear?: () => void;
  clearLabel?: string;
};

export function Select({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  showSearch = false,
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  disabled,
  className,
  contentClassName,
  align = 'start',
  name,
  id,
  size = 'lg',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  clearable = false,
  onClear,
  clearLabel,
}: SelectProps) {
  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const value = isControlled ? valueProp : internal;
  const contentRef = React.useRef<HTMLDivElement>(null);

  const selected = React.useMemo(() => items.find((it) => it.value === value), [items, value]);

  const selectValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onClear) {
      onClear();
    } else {
      selectValue('all');
    }
  };

  const showClearButton = clearable && Boolean(value) && value !== 'all' && value !== '';

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            'border-line text-ink group inline-flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 shadow-2xs transition-[border-color,box-shadow] outline-none',
            FIELD_HEIGHT[size],
            FIELD_TEXT[size],
            'focus:border-accent focus:ring-accent focus:ring-1 focus:outline-none',
            'data-[state=open]:border-accent data-[state=open]:ring-accent data-[state=open]:ring-1',
            'disabled:bg-well/50 disabled:cursor-not-allowed disabled:opacity-60',
            'aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/20',
            className,
          )}
        >
          <span className={cn('flex min-w-0 items-center gap-2', !selected && 'text-subtle')}>
            {selected?.icon && <Icon name={selected.icon} size={14} className="shrink-0" />}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {showClearButton && (
              <span
                role="button"
                tabIndex={0}
                aria-label={clearLabel || `Clear ${ariaLabel || 'filter'}`}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleClear(e);
                  }
                }}
                className="text-subtle hover:text-ink cursor-pointer rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Icon name="x" size={12} />
              </span>
            )}
            <Icon
              name="chevDown"
              size={12}
              className="text-subtle shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
            />
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      {name && <input type="hidden" name={name} value={value ?? ''} />}

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={4}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const root = contentRef.current;
            const input = root?.querySelector<HTMLElement>('input');
            const cmdk = root?.querySelector<HTMLElement>('[cmdk-root]');
            (input ?? cmdk)?.focus();
          }}
          className={cn(
            'bg-panel hairline shadow-pop z-50 min-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[10px]',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            contentClassName,
          )}
        >
          <Command ref={contentRef} tabIndex={showSearch ? undefined : -1} className="outline-none">
            {showSearch && <CommandInput placeholder={searchPlaceholder} />}
            <CommandList className="p-1">
              <CommandEmpty>{emptyText}</CommandEmpty>
              {items.map((it) => {
                const isSelected = it.value === value;
                return (
                  <CommandItem
                    key={it.value}
                    role="option"
                    aria-selected={isSelected}
                    disabled={it.disabled}
                    onSelect={() => selectValue(it.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs',
                      isSelected && 'bg-accent-soft text-accent font-semibold',
                    )}
                  >
                    {it.icon && <Icon name={it.icon} size={14} className="shrink-0" />}
                    <span className="flex-1 truncate">{it.label}</span>
                    {isSelected && <Icon name="check" size={14} className="text-accent shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
