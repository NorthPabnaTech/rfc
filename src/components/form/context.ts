'use client';

import * as React from 'react';

import type { FieldSize } from '@components/ui/field-size';

/** Lets nested fields inherit a `disabled` state from the parent <Form>. */
export const FormDisabledContext = React.createContext(false);

/** Lets fields inherit a default control `size` from the parent <Form>. */
export const FormSizeContext = React.createContext<FieldSize>('lg');

/** Resolve a field's effective size (local prop wins over the form default). */
export function useFormSize(local?: FieldSize) {
  const fromContext = React.useContext(FormSizeContext);
  return local ?? fromContext;
}

/**
 * The name-path prefix contributed by an enclosing <Form.List>. Fields inside a
 * list join this prefix onto their own name (e.g. prefix `['users', 0]` + name
 * `['email']` → `users.0.email`). Empty at the top level.
 */
export const FormListContext = React.createContext<Array<string | number>>([]);

/** Resolve a field's effective disabled state (local prop OR form-wide). */
export function useFormDisabled(local?: boolean) {
  return React.useContext(FormDisabledContext) || Boolean(local);
}
