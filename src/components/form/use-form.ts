'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type PathValue,
  type Resolver,
  useForm as useReactHookForm,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * A FormInstance extends React Hook Form's return type (UseFormReturn) with
 * Ant Design (antd) style API sugar for easier programmatic form control.
 *
 * All standard RHF methods/objects (`watch`, `control`, `handleSubmit`, etc.)
 * are fully accessible on this instance.
 *
 * Example:
 *   const form = useForm<LoginValues>();
 *   form.setFieldsValue({ email: 'a@b.com' }); // Set multiple fields (deep-merged)
 *   form.setFieldValue('password', '••••');     // Set a single field
 *   form.getFieldsValue();                       // Read all field values
 *   form.resetFields();                          // Reset back to defaults
 */
export type FormInstance<T extends FieldValues = FieldValues> = UseFormReturn<T> & {
  /** Sets values for multiple fields. Nested objects are merged, not replaced. */
  setFieldsValue: (values: Partial<T>) => void;
  /** Sets the value of a single field. */
  setFieldValue: <K extends Path<T>>(name: K, value: PathValue<T, K>) => void;
  /** Returns all field values currently registered in the form. */
  getFieldsValue: () => T;
  /** Returns the value of a single field. */
  getFieldValue: <K extends Path<T>>(name: K) => PathValue<T, K>;
  /** Resets the entire form (or specific fields) back to default values. */
  resetFields: (values?: DefaultValues<T>) => void;
  /** Manually triggers validation. Resolves true when the form is valid. */
  validateFields: () => Promise<boolean>;
};

/** Options for `useForm` — RHF options plus an optional zod `schema`. */
export type UseFormOptions<T extends FieldValues> = UseFormProps<T> & {
  /** A zod schema; wired up as the validation resolver (unless `resolver` is set). */
  schema?: ZodType;
};

/** True for `{...}` literals — used to decide what to recurse into vs. set as-is. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Flatten `{ name: { first } }` into `[['name.first', value]]` leaf paths. */
function flattenLeaves(obj: Record<string, unknown>, prefix = ''): Array<[string, unknown]> {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isPlainObject(value) ? flattenLeaves(value, path) : [[path, value]];
  });
}

/**
 * Wraps React Hook Form: defaults validation to 'onTouched', accepts a zod
 * `schema`, and layers antd-style aliases on top of the standard RHF API.
 */
export function useForm<T extends FieldValues = FieldValues>(
  props?: UseFormOptions<T>,
): FormInstance<T> {
  const { schema, resolver, ...rhfProps } = props ?? {};

  const rhf = useReactHookForm<T>({
    mode: 'onTouched',
    // An explicit resolver wins; otherwise derive one from the zod schema.
    // `raw`: the schema only validates — submit handlers get the input values
    // (typed `z.input<>`), and the server action parses them itself. Passing
    // the parsed output instead would double-apply transforms such as
    // `loginIdentifier` (string → { email }) and fail server validation.
    // (cast: the schema is intentionally untyped against T at this boundary.)
    resolver:
      resolver ??
      (schema ? (zodResolver(schema as never, undefined, { raw: true }) as Resolver<T>) : undefined),
    ...rhfProps,
  });

  // Build the wrapper once and keep a stable identity across renders.
  return useMemo(() => {
    const setValueOpts = { shouldDirty: true, shouldTouch: true } as const;

    const customMethods: Record<PropertyKey, unknown> = {
      // Deep-merge: only leaf paths are written, so sibling fields are preserved.
      setFieldsValue: (values: Partial<T>) => {
        for (const [path, value] of flattenLeaves(values as Record<string, unknown>)) {
          rhf.setValue(path as Path<T>, value as PathValue<T, Path<T>>, setValueOpts);
        }
      },
      setFieldValue: (name: Path<T>, value: PathValue<T, Path<T>>) => {
        rhf.setValue(name, value, setValueOpts);
      },
      getFieldsValue: () => rhf.getValues(),
      getFieldValue: (name: Path<T>) => rhf.getValues(name),
      resetFields: (values?: DefaultValues<T>) => rhf.reset(values),
      validateFields: () => rhf.trigger(),
    };

    // Start from the custom methods, then expose every RHF member via a live
    // getter — never mutating `rhf`, keeping its reactive `formState` intact.
    const formInstance: Record<PropertyKey, unknown> = { ...customMethods };
    const rhfSource = rhf as Record<PropertyKey, unknown>;

    for (const key of Reflect.ownKeys(rhf)) {
      if (key in formInstance) continue; // don't shadow our aliases
      Object.defineProperty(formInstance, key, {
        get: () => rhfSource[key],
        enumerable: true,
        configurable: true,
      });
    }

    return formInstance as unknown as FormInstance<T>;
  }, [rhf]);
}
