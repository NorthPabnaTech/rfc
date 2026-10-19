import * as React from 'react';

import { FIELD_TEXT, type FieldSize } from '@components/ui/field-size';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@components/ui/input-group';
import { cn } from '@lib/utils';

export type InputFieldProps = Omit<React.ComponentProps<'input'>, 'prefix' | 'size'> & {
  /** Content shown inside the box, before the field (icon, text, any node). */
  prefix?: React.ReactNode;
  /** Content shown inside the box, after the field (icon, text, any node). */
  suffix?: React.ReactNode;
  /** Control size — defaults to the system `lg`. */
  size?: FieldSize;
  /** Classes for the wrapping input group. */
  containerClassName?: string;
};

/**
 * A single controlled input with optional prefix/suffix, built on the shadcn
 * input-group primitives. It forwards every input prop (value, onChange, …) to
 * the inner control, so it drops straight into <FormItem> like a plain <Input>.
 */
function InputField({
  prefix,
  suffix,
  className,
  containerClassName,
  disabled,
  size = 'lg',
  ...props
}: InputFieldProps) {
  return (
    <InputGroup
      data-disabled={disabled || undefined}
      size={size}
      className={cn(containerClassName)}
    >
      {prefix != null && (
        <InputGroupAddon>
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      )}

      <InputGroupInput className={cn(FIELD_TEXT[size], className)} disabled={disabled} {...props} />

      {suffix != null && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

export { InputField };
