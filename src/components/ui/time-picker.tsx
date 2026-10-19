'use client';

import * as React from 'react';

import type { FieldSize } from '@components/ui/field-size';
import { PickerTrigger } from '@components/ui/picker-trigger';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { cn, dayjs } from '@lib/utils';

/** Default dayjs format for the stored/submitted value. */
const TIME_FORMAT = 'HH:mm';

export type TimePickerProps = {
  /** Stored value, formatted per `format`. */
  value?: string;
  /** Receives the newly formatted value. */
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  /** Control size — defaults to the system `lg`. */
  size?: FieldSize;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  /** dayjs format for the stored value (and the default label). Default 'HH:mm'. */
  format?: string;
  /** dayjs format for the trigger label only. Defaults to `format`. */
  labelFormat?: string;
  /** Step between selectable minutes. Default 1. */
  minuteStep?: number;
  /** antd-style: 24-hour numbers to disable. */
  disabledHours?: () => number[];
  /** antd-style: minute numbers to disable for the currently selected hour. */
  disabledMinutes?: (selectedHour: number) => number[];
};

const pad = (n: number) => n.toString().padStart(2, '0');
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1…12
const PERIODS = ['AM', 'PM'] as const;
type Period = (typeof PERIODS)[number];

/** Convert a 12-hour + AM/PM pair to a 24-hour number. */
const to24 = (hour12: number, period: Period) => (hour12 % 12) + (period === 'PM' ? 12 : 0);

export function TimePicker({
  value,
  onChange,
  onBlur,
  placeholder = 'Select time',
  format = TIME_FORMAT,
  labelFormat,
  disabled,
  className,
  id,
  name,
  minuteStep = 1,
  disabledHours,
  disabledMinutes,
  size = 'lg',
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const minutes = React.useMemo(() => {
    if (minuteStep <= 1) {
      return Array.from({ length: 60 }, (_, i) => i);
    }
    const stepped = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
    const extraMinutes = [56, 57, 58, 59];
    const combined = Array.from(new Set([...stepped, ...extraMinutes])).filter((m) => m <= 59);
    return combined.sort((a, b) => a - b);
  }, [minuteStep]);

  // Parse the stored value with dayjs to drive the columns and the label.
  const parsed = value ? dayjs(value, format) : undefined;
  const valid = parsed?.isValid() ?? false;
  const hour24 = valid ? parsed!.hour() : undefined;
  const minute = valid ? parsed!.minute() : undefined;
  const period: Period | undefined = hour24 === undefined ? undefined : hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 === undefined ? undefined : hour24 % 12 === 0 ? 12 : hour24 % 12;

  const label = valid ? parsed!.format(labelFormat ?? format) : placeholder;

  // Resolve the disabled sets. Hours are evaluated in the active period so the
  // 12-hour buttons map onto the correct 24-hour numbers.
  const activePeriod = period ?? 'AM';
  const disabledHourSet = new Set(disabledHours?.());
  const disabledMinuteSet = new Set(disabledMinutes?.(hour24 ?? to24(hour12 ?? 12, activePeriod)));
  const isPeriodDisabled = (p: Period) =>
    Boolean(disabledHours) && HOURS_12.every((h) => disabledHourSet.has(to24(h, p)));

  // Recombine 12-hour parts and emit the value in the requested `format`.
  const commit = (h12: number, m: number, p: Period) => {
    onChange?.(dayjs().hour(to24(h12, p)).minute(m).second(0).format(format));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <PickerTrigger
          id={id}
          name={name}
          icon="clock"
          disabled={disabled}
          invalid={invalid}
          size={size}
          aria-describedby={describedBy}
          hasValue={valid}
          className={className}
        >
          {label}
        </PickerTrigger>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto overflow-hidden p-0">
        <div className="flex h-[232px] divide-x divide-[var(--color-line)]">
          <TimeColumn
            label="Hour"
            values={HOURS_12}
            selected={hour12}
            format={pad}
            isDisabled={(h) => disabledHourSet.has(to24(h, activePeriod))}
            onSelect={(h) => commit(h, minute ?? 0, activePeriod)}
          />
          <TimeColumn
            label="Min"
            values={minutes}
            selected={minute}
            format={pad}
            isDisabled={(m) => disabledMinuteSet.has(m)}
            onSelect={(m) => commit(hour12 ?? 12, m, activePeriod)}
          />
          <TimeColumn
            label="AM/PM"
            values={PERIODS}
            selected={period}
            format={(p) => p}
            isDisabled={isPeriodDisabled}
            onSelect={(p) => commit(hour12 ?? 12, minute ?? 0, p)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** One scrollable column, styled like the Select list. Works for numbers or AM/PM. */
function TimeColumn<T extends string | number>({
  label,
  values,
  selected,
  format,
  isDisabled,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  selected?: T;
  format: (value: T) => string;
  isDisabled?: (value: T) => boolean;
  onSelect: (value: T) => void;
}) {
  return (
    // `min-h-0` lets the list shrink below its content height — without it the
    // flex child keeps its auto minimum and never scrolls.
    <div className="flex min-h-0 w-16 flex-col">
      <div className="text-muted-foreground border-line shrink-0 border-b px-2 py-1.5 text-center text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
        {values.map((v) => {
          const disabled = isDisabled?.(v) ?? false;
          return (
            <button
              key={String(v)}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(v)}
              className={cn(
                'hover:bg-well w-full rounded-md px-2 py-1.5 text-center text-[13px] transition-colors',
                v === selected && 'bg-brand-soft text-brand-ink font-medium',
                disabled && 'pointer-events-none opacity-40',
              )}
            >
              {format(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
