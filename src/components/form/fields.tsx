'use client';

import * as React from 'react';

import {
  CurrencyInput,
  ImageUpload,
  NumericFormatInput,
  type NumericFormatInputProps,
  QuantityInput,
} from '@components/shared';
import { Checkbox } from '@components/ui/checkbox';
import {
  DatePicker,
  type DatePickerProps,
  DateRangePicker,
  type DateRangePickerProps,
} from '@components/ui/date-picker';
import { InputField, type InputFieldProps } from '@components/ui/input-field';
import { Label } from '@components/ui/label';
import { PasswordInput } from '@components/ui/password-input';
import { Select, type SelectProps } from '@components/ui/select';
import { Switch } from '@components/ui/switch';
import { Textarea } from '@components/ui/textarea';
import { TimePicker, type TimePickerProps } from '@components/ui/time-picker';

import { useFormDisabled, useFormSize } from './context';
import { FormItem, type FormItemProps } from './form-item';

/**
 * Convenience fields = <FormItem> pre-wired to a control, so the common case is
 * one tag. For anything custom, drop to <FormItem> with your own control.
 *
 *   <FormInput name="email" label="Email" required prefix={<Icon name="user" />} />
 *   <FormSelect name="role" label="Role" items={roles} />
 *   <FormDatePicker name="dob" label="Date of birth" />
 */

/** Layout props every field forwards to <FormItem>. */
type ShellProps = Pick<FormItemProps, 'name' | 'label' | 'required' | 'hint' | 'className'>;

const splitShell = <P extends ShellProps>({
  name,
  label,
  required,
  hint,
  className,
  ...rest
}: P) => ({
  shell: { name, label, required, hint, className },
  control: rest,
});

/* ── Text & number inputs (prefix/suffix via the shadcn input group) ────── */

type FieldInputProps = Omit<InputFieldProps, 'name'>;

export function FormInput(props: ShellProps & FieldInputProps) {
  const { shell, control } = splitShell(props);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell}>
      <InputField {...control} size={size} />
    </FormItem>
  );
}

export function FormPassword(props: ShellProps & Omit<FieldInputProps, 'type' | 'suffix'>) {
  const { shell, control } = splitShell(props);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell}>
      <PasswordInput {...control} size={size} />
    </FormItem>
  );
}

export function FormNumber(props: ShellProps & FieldInputProps) {
  const { shell, control } = splitShell(props);
  const size = useFormSize(control.size);
  return (
    <FormItem
      {...shell}
      getValueFromEvent={(e) => {
        const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
        return raw === '' ? undefined : Number(raw);
      }}
    >
      <InputField type="number" inputMode="decimal" {...control} size={size} />
    </FormItem>
  );
}

/** Integer number field with live Bangladesh/Indian-style comma formatting. */
export function FormInteger(props: ShellProps & Omit<NumericFormatInputProps, 'name'>) {
  const { shell, control } = splitShell(props);
  return (
    <FormItem {...shell} getValueFromEvent={(_e: unknown, val: unknown) => val}>
      <NumericFormatInput {...control} />
    </FormItem>
  );
}

/** Quantity integer field with live Bangladesh/Indian-style comma formatting. */
export function FormQuantity(props: ShellProps & Omit<NumericFormatInputProps, 'name'>) {
  const { shell, control } = splitShell(props);
  return (
    <FormItem {...shell} getValueFromEvent={(_e: unknown, val: unknown) => val}>
      <QuantityInput min={1} {...control} />
    </FormItem>
  );
}

/** Currency/price integer field with live Bangladesh/Indian-style comma formatting and BDT prefix. */
export function FormCurrency(props: ShellProps & Omit<NumericFormatInputProps, 'name'>) {
  const { shell, control } = splitShell(props);
  return (
    <FormItem {...shell} getValueFromEvent={(_e: unknown, val: unknown) => val}>
      <CurrencyInput {...control} />
    </FormItem>
  );
}

/** Time field — system-styled popover, value is an `"HH:mm"` string. */
export function FormTimePicker(
  props: ShellProps & Omit<TimePickerProps, 'value' | 'onChange' | 'name'>,
) {
  const { shell, control } = splitShell(props);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell}>
      <TimePicker {...control} size={size} />
    </FormItem>
  );
}

/* ── Textarea ──────────────────────────────────────────────────────────── */

type TextareaProps = Omit<React.ComponentProps<typeof Textarea>, 'name' | 'form'>;

export function FormTextarea(props: ShellProps & TextareaProps) {
  const { shell, control } = splitShell(props);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell}>
      <Textarea {...control} size={size} />
    </FormItem>
  );
}

/* ── Select (combobox) ─────────────────────────────────────────────────── */

type FormSelectProps = ShellProps &
  Omit<SelectProps, 'value' | 'defaultValue' | 'onValueChange' | 'name'>;

export function FormSelect(props: FormSelectProps) {
  const { shell, control } = splitShell(props);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell} trigger="onValueChange" getValueFromEvent={(value) => value}>
      <Select {...control} size={size} />
    </FormItem>
  );
}

/* ── Date pickers (value is a formatted string / { from, to } strings) ──── */

type FormDatePickerProps = ShellProps & Omit<DatePickerProps, 'value' | 'onChange' | 'name'>;

export function FormDatePicker(props: FormDatePickerProps) {
  const { shell, control } = splitShell(props);
  const disabled = useFormDisabled(control.disabled);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell}>
      {(field, _state, meta) => (
        <DatePicker
          {...control}
          size={size}
          id={field.name}
          value={field.value as string | undefined}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
          aria-invalid={meta.invalid || undefined}
          aria-describedby={meta.describedBy}
        />
      )}
    </FormItem>
  );
}

type FormDateRangePickerProps = ShellProps &
  Omit<DateRangePickerProps, 'value' | 'onChange' | 'name'>;

export function FormDateRangePicker(props: FormDateRangePickerProps) {
  const { shell, control } = splitShell(props);
  const disabled = useFormDisabled(control.disabled);
  const size = useFormSize(control.size);
  return (
    <FormItem {...shell}>
      {(field, _state, meta) => (
        <DateRangePicker
          {...control}
          size={size}
          id={field.name}
          value={field.value as DateRangePickerProps['value']}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
          aria-invalid={meta.invalid || undefined}
          aria-describedby={meta.describedBy}
        />
      )}
    </FormItem>
  );
}

/* ── Image upload (value is a data URL / image URL string) ──────────────── */

export function FormImageUpload(props: ShellProps & { disabled?: boolean }) {
  const { shell, control } = splitShell(props);
  const disabled = useFormDisabled(control.disabled);
  return (
    <FormItem {...shell}>
      {(field, _state, meta) => (
        <ImageUpload
          id={field.name}
          value={field.value as string | undefined}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
          aria-invalid={meta.invalid || undefined}
          aria-describedby={meta.describedBy}
        />
      )}
    </FormItem>
  );
}

/* ── Checkbox & Switch (boolean, inline label) ─────────────────────────── */

type CheckboxProps = Omit<
  React.ComponentProps<typeof Checkbox>,
  'name' | 'checked' | 'defaultChecked' | 'onCheckedChange'
>;

export function FormCheckbox(props: ShellProps & CheckboxProps) {
  const { shell, control } = splitShell(props);
  const disabled = useFormDisabled(control.disabled);
  return (
    <FormItem {...shell} label={undefined}>
      {(field, _state, meta) => (
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            {...control}
            id={field.name}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-invalid={meta.invalid || undefined}
            aria-describedby={meta.describedBy}
          />
          {shell.label && <span className="text-[13px] select-none">{shell.label}</span>}
        </label>
      )}
    </FormItem>
  );
}

type SwitchProps = Omit<
  React.ComponentProps<typeof Switch>,
  'name' | 'checked' | 'defaultChecked' | 'onCheckedChange'
>;

export function FormSwitch(props: ShellProps & SwitchProps) {
  const { shell, control } = splitShell(props);
  const disabled = useFormDisabled(control.disabled);
  return (
    <FormItem {...shell} label={undefined}>
      {(field, _state, meta) => (
        <div className="flex items-center justify-between gap-3">
          {shell.label && (
            <Label htmlFor={field.name} className="cursor-pointer">
              {shell.label}
            </Label>
          )}
          <Switch
            {...control}
            id={field.name}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            disabled={disabled}
            aria-invalid={meta.invalid || undefined}
            aria-describedby={meta.describedBy}
          />
        </div>
      )}
    </FormItem>
  );
}
