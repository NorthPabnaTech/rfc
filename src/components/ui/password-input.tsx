'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { FIELD_TEXT } from '@components/ui/field-size';
import type { InputFieldProps } from '@components/ui/input-field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@components/ui/input-group';
import { cn } from '@lib/utils';

/**
 * Password field with a show/hide toggle pinned to the right, built on the same
 * input-group primitives as <InputField> so it matches every other field.
 */
function PasswordInput({
  prefix,
  className,
  containerClassName,
  disabled,
  size = 'lg',
  ...props
}: Omit<InputFieldProps, 'type' | 'suffix'>) {
  const [visible, setVisible] = React.useState(false);

  return (
    <InputGroup
      data-disabled={disabled || undefined}
      size={size}
      className={cn(containerClassName)}
    >
      {prefix != null && <InputGroupAddon>{prefix}</InputGroupAddon>}

      <InputGroupInput
        type={visible ? 'text' : 'password'}
        className={cn(FIELD_TEXT[size], className)}
        disabled={disabled}
        {...props}
      />

      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          tabIndex={-1}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={16} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
