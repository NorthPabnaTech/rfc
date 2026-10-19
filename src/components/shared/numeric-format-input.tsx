'use client';

import * as React from 'react';

import { cn } from '@lib/utils';
import { calculateCaretPosition, formatIntegerEnIn, parseIntegerEnIn } from '@lib/utils/format';

export type NumericFormatInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'prefix'
> & {
  /** Underlying numeric value (unformatted number). */
  value?: number | string | null;
  /** Initial numeric value. */
  defaultValue?: number | string | null;
  /** Callback fired whenever the numeric value changes, providing raw number and formatted string. */
  onValueChange?: (value: number | undefined, formattedValue: string) => void;
  /** Standard change handler with synthetic-like event. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, value: number | undefined) => void;
  /** Minimum numeric value allowed. */
  min?: number;
  /** Maximum numeric value allowed. */
  max?: number;
  /** Optional prefix element rendered inside/alongside the input. */
  prefix?: React.ReactNode;
  /** Optional suffix element. */
  suffix?: React.ReactNode;
  /** Allow negative numbers (default: false). */
  allowNegative?: boolean;
  /** Dynamic container styles/classes. */
  containerClassName?: string;
};

/**
 * Reusable Numeric Input with Live Bangladesh/Indian-Style Comma Formatting.
 *
 * Features:
 * - Integer-only: strictly blocks decimal points (.), commas (,), exponent (e), and negative signs.
 * - Formats live as the user types (e.g. 1000 → 1,000, 130000 → 1,30,000, 2500000 → 25,00,000).
 * - Preserves cursor/caret position accurately on insertion, deletion, and backspacing.
 * - Stores and reports the underlying numeric value without commas for calculations and validations.
 */
export const NumericFormatInput = React.forwardRef<HTMLInputElement, NumericFormatInputProps>(
  function NumericFormatInput(
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      min: _min,
      max: _max,
      prefix,
      suffix,
      allowNegative = false,
      containerClassName,
      className,
      disabled,
      placeholder = '0',
      onKeyDown,
      ...restProps
    },
    forwardedRef,
  ) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const caretPositionRef = React.useRef<number | null>(null);

    // Initial formatted display state
    const initialRaw = value !== undefined ? value : defaultValue;
    const [displayValue, setDisplayValue] = React.useState<string>(() =>
      formatIntegerEnIn(initialRaw),
    );

    // Synchronize displayValue when external controlled `value` changes
    React.useEffect(() => {
      if (value !== undefined) {
        const formattedFromProp = formatIntegerEnIn(value);
        const currentParsed = parseIntegerEnIn(displayValue);
        const propParsed = parseIntegerEnIn(value);

        if (currentParsed !== propParsed) {
          setDisplayValue(formattedFromProp);
        }
      }
    }, [value, displayValue]);

    // Restore caret position after React DOM render to prevent cursor jumping
    React.useLayoutEffect(() => {
      if (caretPositionRef.current !== null && inputRef.current) {
        const targetPos = Math.min(caretPositionRef.current, inputRef.current.value.length);
        inputRef.current.setSelectionRange(targetPos, targetPos);
        caretPositionRef.current = null;
      }
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      const input = inputRef.current;
      if (!input) return;

      // Disallow decimals, commas, scientific notation, and sign keys
      if (
        e.key === '.' ||
        e.key === ',' ||
        e.key === 'e' ||
        e.key === 'E' ||
        e.key === '+' ||
        (!allowNegative && e.key === '-')
      ) {
        e.preventDefault();
        return;
      }

      // Allow navigation and shortcut keys (Ctrl/Cmd + C/V/A/Z/X, Tab, Enter, Arrows, etc.)
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Enter' ||
        e.key === 'Escape' ||
        e.key.startsWith('Arrow') ||
        e.key === 'Home' ||
        e.key === 'End'
      ) {
        // Special UX enhancement for Backspace on commas:
        // If cursor is immediately after a comma, delete the digit preceding the comma instead of getting stuck!
        if (e.key === 'Backspace') {
          const start = input.selectionStart ?? 0;
          const end = input.selectionEnd ?? 0;
          if (start === end && start > 0 && input.value[start - 1] === ',') {
            e.preventDefault();
            const before = input.value.slice(0, start - 2);
            const after = input.value.slice(start);
            const combined = before + after;
            const rawDigits = combined.replace(/\D/g, '');
            const rawDigitsBefore = before.replace(/\D/g, '').length;
            const formatted = formatIntegerEnIn(rawDigits);
            const newPos = calculateCaretPosition(formatted, rawDigitsBefore);

            caretPositionRef.current = newPos;
            setDisplayValue(formatted);

            const numVal = parseIntegerEnIn(formatted);
            onValueChange?.(numVal, formatted);
            if (onChange) {
              const syntheticEvent = {
                ...e,
                target: { ...input, value: formatted },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent, numVal);
            }
          }
        }
        return;
      }

      // Block any character that is not a numeric digit
      if (e.key.length === 1 && !/\d/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = e.target;
      const rawString = target.value;
      const selectionStart = target.selectionStart ?? rawString.length;

      // How many actual numeric digits were to the left of the caret before reformatting
      const rawDigitsBefore = rawString.slice(0, selectionStart).replace(/\D/g, '').length;

      // Extract integer digits only
      const cleanDigits = rawString.replace(/\D/g, '');

      // Format into Bangladesh/Indian grouping
      const formatted = formatIntegerEnIn(cleanDigits);

      // Compute precise caret position inside the new formatted string
      const newCaretPos = calculateCaretPosition(formatted, rawDigitsBefore);
      caretPositionRef.current = newCaretPos;

      setDisplayValue(formatted);

      const numericVal = parseIntegerEnIn(formatted);

      onValueChange?.(numericVal, formatted);
      onChange?.(e, numericVal);
    };

    // If prefix or suffix is provided, wrap in an inline flex container
    if (prefix || suffix) {
      return (
        <div
          className={cn(
            'border-line flex h-[34px] w-full items-center rounded-md border bg-white px-2.5 shadow-2xs transition-colors',
            'focus-within:border-accent focus-within:ring-accent focus-within:ring-1',
            disabled && 'bg-well/50 cursor-not-allowed opacity-60',
            containerClassName,
          )}
        >
          {prefix && <span className="mr-1.5 shrink-0 text-current select-none">{prefix}</span>}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              'text-ink placeholder:text-muted/60 h-full w-full min-w-0 bg-transparent text-right font-mono text-xs font-semibold outline-none',
              className,
            )}
            {...restProps}
          />
          {suffix && <span className="ml-1.5 shrink-0 text-current select-none">{suffix}</span>}
        </div>
      );
    }

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'border-line text-ink flex h-[34px] w-full min-w-0 rounded-md border bg-white px-2.5 py-1 text-right font-mono text-xs font-semibold shadow-2xs transition-[border-color,box-shadow] outline-none',
          'focus:border-accent focus:ring-accent focus:ring-1',
          'disabled:bg-well/50 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...restProps}
      />
    );
  },
);

NumericFormatInput.displayName = 'NumericFormatInput';

/**
 * Quantity Input Component with live comma formatting and integer-only validation.
 */
export const QuantityInput = React.forwardRef<HTMLInputElement, NumericFormatInputProps>(
  function QuantityInput(props, ref) {
    return <NumericFormatInput ref={ref} min={1} placeholder="0" {...props} />;
  },
);

QuantityInput.displayName = 'QuantityInput';

/**
 * Currency/Price Input Component with live comma formatting, integer-only validation,
 * and BDT prefix styled ~1-2px smaller in the exact same color.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, NumericFormatInputProps>(
  function CurrencyInput({ prefix, className, containerClassName, ...props }, ref) {
    const bdtPrefix = prefix ?? (
      <span className="font-mono text-[calc(1em-1.5px)] font-semibold tracking-tight text-current uppercase select-none">
        BDT
      </span>
    );

    return (
      <NumericFormatInput
        ref={ref}
        prefix={bdtPrefix}
        containerClassName={containerClassName}
        className={className}
        placeholder="0"
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';
