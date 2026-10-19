'use client';

import * as React from 'react';
import type { Dayjs } from 'dayjs';
import { type DateRange as RdpDateRange } from 'react-day-picker';

import { Calendar } from '@components/ui/calendar';
import type { FieldSize } from '@components/ui/field-size';
import { PickerTrigger } from '@components/ui/picker-trigger';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { dayjs } from '@lib/utils';

/** Default dayjs format for the stored/submitted value. */
const DATE_FORMAT = 'YYYY-MM-DD';

/** A selected range as formatted strings (antd-style — both ends optional). */
export type DateRange = { from?: string; to?: string };

/** Caption layout for the calendar — `dropdown` gives month + year selects. */
type CaptionLayout = React.ComponentProps<typeof Calendar>['captionLayout'];

/** Props shared by both pickers. */
type SharedProps = {
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  /** Control size — defaults to the system `lg`. */
  size?: FieldSize;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  /** dayjs format for the stored value (and the default label). Default 'YYYY-MM-DD'. */
  format?: string;
  /** dayjs format for the trigger label only. Defaults to `format`. */
  labelFormat?: string;
  /** antd-style: return true to disable a day (e.g. `disablePastDates`). */
  disabledDate?: (current: Dayjs) => boolean;
  /** Bounds for navigation + the year dropdown. */
  startMonth?: Date;
  endMonth?: Date;
  captionLayout?: CaptionLayout;
  clearable?: boolean;
  onClear?: () => void;
  clearLabel?: string;
};

/** Adapt a dayjs-based `disabledDate` to react-day-picker's Date matcher. */
function toDayMatcher(disabledDate?: (current: Dayjs) => boolean) {
  return disabledDate ? (date: Date) => disabledDate(dayjs(date)) : undefined;
}

/** Default bounds: 100 years back, 5 years ahead — covers DOB through scheduling. */
function defaultBounds(start?: Date, end?: Date) {
  const year = new Date().getFullYear();
  return {
    start: start ?? new Date(year - 100, 0),
    end: end ?? new Date(year + 5, 11),
  };
}

/** Parse a stored string into a Date for the calendar (undefined when empty/invalid). */
function toDate(value: string | undefined, format: string) {
  if (!value) return undefined;
  const parsed = dayjs(value, format);
  return parsed.isValid() ? parsed.toDate() : undefined;
}

/* ── Single date ───────────────────────────────────────────────────────── */

export type DatePickerProps = SharedProps & {
  /** Stored value, formatted per `format`. */
  value?: string;
  /** Receives the newly formatted value (empty string when cleared). */
  onChange?: (value: string) => void;
  placeholder?: string;
};

export function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder = 'Pick a date',
  format = DATE_FORMAT,
  labelFormat,
  disabledDate,
  disabled,
  className,
  id,
  name,
  startMonth,
  endMonth,
  captionLayout = 'dropdown',
  size = 'lg',
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
  clearable = false,
  onClear,
  clearLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const bounds = defaultBounds(startMonth, endMonth);

  const selected = toDate(value, format);
  const label = selected ? dayjs(selected).format(labelFormat ?? format) : placeholder;

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
          icon="calendar"
          disabled={disabled}
          invalid={invalid}
          size={size}
          aria-describedby={describedBy}
          hasValue={Boolean(selected)}
          clearable={clearable}
          onClear={onClear || (() => onChange?.(''))}
          clearLabel={clearLabel || 'Clear date'}
          className={className}
        >
          {label}
        </PickerTrigger>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange?.(date ? dayjs(date).format(format) : '');
            setOpen(false);
          }}
          defaultMonth={selected}
          disabled={toDayMatcher(disabledDate)}
          captionLayout={captionLayout}
          startMonth={bounds.start}
          endMonth={bounds.end}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ── Date range ────────────────────────────────────────────────────────── */

export type DateRangePickerProps = SharedProps & {
  /** Stored value — `from`/`to` formatted per `format`. */
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  numberOfMonths?: number;
};

export function DateRangePicker({
  value,
  onChange,
  onBlur,
  placeholder = 'Pick a date range',
  format = DATE_FORMAT,
  labelFormat,
  disabledDate,
  disabled,
  className,
  id,
  name,
  startMonth,
  endMonth,
  captionLayout = 'dropdown',
  numberOfMonths = 2,
  size = 'lg',
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
  clearable = false,
  onClear,
  clearLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const bounds = defaultBounds(startMonth, endMonth);

  const from = toDate(value?.from, format);
  const to = toDate(value?.to, format);
  const display = labelFormat ?? format;
  const label = from
    ? to
      ? `${dayjs(from).format(display)} – ${dayjs(to).format(display)}`
      : dayjs(from).format(display)
    : placeholder;

  const selected: RdpDateRange | undefined = from ? { from, to } : undefined;

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
          icon="calendar"
          disabled={disabled}
          invalid={invalid}
          size={size}
          aria-describedby={describedBy}
          hasValue={Boolean(from)}
          clearable={clearable}
          onClear={onClear || (() => onChange?.({ from: undefined, to: undefined }))}
          clearLabel={clearLabel || 'Clear date range'}
          className={className}
        >
          {label}
        </PickerTrigger>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) =>
            onChange?.({
              from: range?.from ? dayjs(range.from).format(format) : undefined,
              to: range?.to ? dayjs(range.to).format(format) : undefined,
            })
          }
          defaultMonth={from}
          disabled={toDayMatcher(disabledDate)}
          numberOfMonths={numberOfMonths}
          captionLayout={captionLayout}
          startMonth={bounds.start}
          endMonth={bounds.end}
        />
      </PopoverContent>
    </Popover>
  );
}
