'use client';

import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { FIELD_HEIGHT, FIELD_TEXT, type FieldSize } from '@components/ui/field-size';
import { cn } from '@lib/utils';

/** Field-shaped trigger shared by the date / range / time pickers — matches <Input>. */
const pickerTriggerClass = cn(
  'border border-line flex w-full min-w-0 items-center justify-between gap-2 rounded-md bg-white px-3 shadow-2xs transition-[border-color,box-shadow] outline-none text-ink',
  'focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none',
  'focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none',
  'data-[invalid=true]:border-red-500 data-[invalid=true]:ring-1 data-[invalid=true]:ring-red-500/20',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-well/50 disabled:opacity-60',
);

type PickerTriggerProps = Omit<React.ComponentProps<'button'>, 'size'> & {
  /** Trailing glyph (e.g. `calendar`, `clock`). */
  icon: IconRegistryKey;
  /** Drives the muted placeholder colour when nothing is selected. */
  hasValue?: boolean;
  /** Renders the destructive ring/border. */
  invalid?: boolean;
  /** Control size — defaults to the system `lg`. */
  size?: FieldSize;
  clearable?: boolean;
  onClear?: () => void;
  clearLabel?: string;
};

/** forwardRef so it can be the `asChild` target of a Popover trigger. */
const PickerTrigger = React.forwardRef<HTMLButtonElement, PickerTriggerProps>(
  function PickerTrigger(
    {
      icon,
      hasValue,
      invalid,
      size = 'lg',
      clearable = false,
      onClear,
      clearLabel = 'Clear date range',
      className,
      children,
      ...props
    },
    ref,
  ) {
    const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClear?.();
    };

    return (
      <button
        ref={ref}
        type="button"
        data-invalid={invalid || undefined}
        className={cn(
          pickerTriggerClass,
          'group',
          FIELD_HEIGHT[size],
          FIELD_TEXT[size],
          !hasValue && 'text-muted-foreground',
          className,
        )}
        {...props}
      >
        <span className="truncate">{children}</span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && hasValue && (
            <span
              role="button"
              tabIndex={0}
              aria-label={clearLabel}
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
          <Icon name={icon} size={16} className="text-muted-foreground shrink-0" />
        </span>
      </button>
    );
  },
);

export { PickerTrigger };
