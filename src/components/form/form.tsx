'use client';

import * as React from 'react';
import {
  type DefaultValues,
  type FieldErrors,
  type FieldValues,
  FormProvider,
  useWatch,
} from 'react-hook-form';
import type { ZodType } from 'zod';

import type { FieldSize } from '@components/ui/field-size';
import { cn } from '@lib/utils';

import { FormDisabledContext, FormSizeContext } from './context';
import { FormItem } from './form-item';
import { FormList } from './form-list';
import { type FormInstance, useForm } from './use-form';

export type FormProps<T extends FieldValues = FieldValues> = {
  /** Instance from `useForm()`. Omit and <Form> creates (and owns) its own. */
  form?: FormInstance<T>;
  /** Default values for the auto-created instance (ignored if `form` is given). */
  initialValues?: DefaultValues<T>;
  /** zod schema for the auto-created instance (ignored if `form` is given). */
  schema?: ZodType;
  /** Called with the typed values on a valid submit. */
  onFinish?: (values: T) => void | Promise<void>;
  /** Called with field errors when validation blocks submit. */
  onFinishFailed?: (errors: FieldErrors<T>) => void;
  /** Disable every field in the form. */
  disabled?: boolean;
  /** Default control size for every field in this form. Defaults to `lg`. */
  size?: FieldSize;
  children: React.ReactNode;
} & Omit<React.ComponentProps<'form'>, 'onSubmit' | 'children'>;

function FormComponent<T extends FieldValues = FieldValues>({
  form: external,
  initialValues,
  schema,
  onFinish,
  onFinishFailed,
  disabled = false,
  size = 'lg',
  className,
  children,
  ...rest
}: FormProps<T>) {
  // Hooks can't be conditional, so always create a fallback and use it only when
  // the caller didn't pass their own instance.
  const fallback = useForm<T>({ defaultValues: initialValues, schema });
  const form = external ?? fallback;

  return (
    <FormProvider {...form}>
      <FormDisabledContext.Provider value={disabled}>
        <FormSizeContext.Provider value={size}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => onFinish?.(values), onFinishFailed)}
            className={cn('grid gap-5', className)}
            {...rest}
          >
            {children}
          </form>
        </FormSizeContext.Provider>
      </FormDisabledContext.Provider>
    </FormProvider>
  );
}

/**
 * antd-flavoured form on top of react-hook-form + the local UI kit.
 *
 *   const form = Form.useForm<LoginValues>();
 *   <Form form={form} initialValues={{ remember: true }} onFinish={handle}>
 *     <FormInput name="email" label="Email" required />
 *     <Form.Item name="password" label="Password"><Input type="password" /></Form.Item>
 *   </Form>
 */
export const Form = Object.assign(FormComponent, {
  useForm,
  useWatch,
  Item: FormItem,
  List: FormList,
});
