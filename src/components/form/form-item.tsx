'use client';

import * as React from 'react';
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldValues,
  useFormContext,
} from 'react-hook-form';

import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';

import { FormDisabledContext, FormListContext } from './context';
import { joinPath, type NamePath, toPathArray } from './path';

/** Extra info passed to a render-prop child so it can wire its own a11y. */
export type FieldMeta = {
  invalid: boolean;
  error?: string;
  /** Id of the message element — set as the control's `aria-describedby`. */
  describedBy?: string;
};

type FieldRender = (
  field: ControllerRenderProps<FieldValues, string>,
  state: ControllerFieldState,
  meta: FieldMeta,
) => React.ReactElement;

export type FormItemProps = {
  /**
   * Field name. Accepts a nested path (`['name', 'first']`) and is combined with
   * any enclosing <Form.List> prefix. Omit to render a plain label-only row.
   */
  name?: NamePath;
  label?: React.ReactNode;
  /** Shows the required asterisk on the label. Validation is handled by your schema. */
  required?: boolean;
  /** Helper text shown below the control when there's no error. */
  hint?: React.ReactNode;
  className?: string;
  /** Prop the control reads its value from. Default `'value'`. */
  valuePropName?: string;
  /** Event the control reports changes through. Default `'onChange'`. */
  trigger?: string;
  /** Map the control's change args to the stored value. */
  getValueFromEvent?: (...args: unknown[]) => unknown;
  /** A control to auto-wire, or `(field, state, meta) => <Control />` for full control. */
  children: React.ReactElement | FieldRender;
};

const isEventLike = (arg: unknown): arg is { target: { value: unknown; checked: unknown } } =>
  typeof arg === 'object' && arg !== null && 'target' in arg;

export function FormItem({
  name,
  label,
  required,
  hint,
  className,
  valuePropName = 'value',
  trigger = 'onChange',
  getValueFromEvent,
  children,
}: FormItemProps) {
  const form = useFormContext();
  const formDisabled = React.useContext(FormDisabledContext);
  const listPrefix = React.useContext(FormListContext);

  // Combine the list prefix (if any) with this field's name into an RHF path.
  const path = name == null ? undefined : joinPath([...listPrefix, ...toPathArray(name)]);

  const labelNode = label && (
    <Label htmlFor={path}>
      {label}
      {required && (
        <span className="text-[var(--status-danger-fg)]" aria-hidden>
          *
        </span>
      )}
    </Label>
  );

  // No field binding — just a labelled layout row.
  if (!path || !form) {
    return (
      <div className={cn(FIELD_STACK, className)}>
        {labelNode}
        {typeof children !== 'function' && children}
        {hint && <FieldMessage>{hint}</FieldMessage>}
      </div>
    );
  }

  const errorId = `${path}-error`;
  const hintId = `${path}-hint`;

  return (
    <Controller
      name={path}
      control={form.control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        // Link the control to whichever message is visible (error wins over hint).
        const describedBy = error ? errorId : hint ? hintId : undefined;
        const meta: FieldMeta = { invalid: Boolean(error), error, describedBy };

        const control =
          typeof children === 'function'
            ? children(field, fieldState, meta)
            : wireControl(children, field, {
                valuePropName,
                trigger,
                getValueFromEvent,
                disabled: formDisabled,
                invalid: meta.invalid,
                describedBy,
              });

        // Label → control → message, all in normal flow: a hint or an error
        // takes real space (wrapping if long), so it can never sit on top of
        // the next field. Spacing between fields comes from the form's gap.
        return (
          <div className={cn(FIELD_STACK, className)}>
            {labelNode}
            {control}
            {(error || hint) && (
              <FieldMessage id={error ? errorId : hintId} error={Boolean(error)}>
                {error ?? hint}
              </FieldMessage>
            )}
          </div>
        );
      }}
    />
  );
}

/**
 * Wires form control props (value, name, onChange, onBlur, ref, disabled, a11y)
 * into the child element, while preserving its existing event handlers.
 */
function wireControl(
  child: React.ReactElement,
  field: ControllerRenderProps<FieldValues, string>,
  options: {
    valuePropName: string;
    trigger: string;
    getValueFromEvent?: (...args: unknown[]) => unknown;
    disabled: boolean;
    invalid: boolean;
    describedBy?: string;
  },
) {
  const childProps = child.props as Record<string, unknown>;
  const { valuePropName, trigger, getValueFromEvent, disabled, invalid, describedBy } = options;

  // Resolve the value carried by the control's change event.
  const getEventValue = (...args: unknown[]) => {
    if (getValueFromEvent) return getValueFromEvent(...args);

    const firstArg = args[0];
    if (isEventLike(firstArg)) {
      return valuePropName === 'checked' ? firstArg.target.checked : firstArg.target.value;
    }
    return firstArg;
  };

  // Call the child's own handler (if any) after RHF's.
  const callOriginalHandler = (handlerName: string, ...args: unknown[]) => {
    (childProps[handlerName] as ((...a: unknown[]) => void) | undefined)?.(...args);
  };

  const fallbackValue = valuePropName === 'checked' ? false : '';

  return React.cloneElement(child, {
    // `field.ref` lets RHF focus this control when `shouldFocusError` triggers.
    ref: field.ref,
    id: childProps.id ?? field.name,
    name: field.name,
    [valuePropName]: field.value ?? fallbackValue,
    [trigger]: (...args: unknown[]) => {
      field.onChange(getEventValue(...args));
      callOriginalHandler(trigger, ...args);
    },
    onBlur: (...args: unknown[]) => {
      field.onBlur();
      callOriginalHandler('onBlur', ...args);
    },
    disabled: Boolean(childProps.disabled) || disabled,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy ?? (childProps['aria-describedby'] as string | undefined),
  } as Record<string, unknown>);
}

/** Vertical rhythm of one field: label, control and message, 6px apart. */
const FIELD_STACK = 'flex min-w-0 flex-col gap-1.5';

/** Helper text or validation error under a control. Wraps; never overlaps. */
export function FieldMessage({
  id,
  error = false,
  children,
}: {
  id?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role={error ? 'alert' : undefined}
      className={cn(
        'type-helper break-words',
        error ? 'font-medium text-[var(--status-danger-fg)]' : 'text-muted',
      )}
    >
      {children}
    </p>
  );
}
