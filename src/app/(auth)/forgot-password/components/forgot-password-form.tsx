'use client';

import * as React from 'react';

import { forgotPasswordAction } from '@/actions/auth';
import { Form, FormInput } from '@components/form';
import { Callout } from '@components/shared/callout';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { PASSWORD_RESET_TTL_MINUTES } from '@lib/constants';
import { type ForgotPasswordInput, forgotPasswordSchema } from '@lib/validators/auth';

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const form = Form.useForm<ForgotPasswordInput>({
    schema: forgotPasswordSchema,
    defaultValues: { email: '' },
  });
  const { isSubmitting } = form.formState;

  if (sent) {
    return (
      <div className="mt-8 flex flex-col gap-4">
        <Callout tone="success" title="Check your email">
          If an account exists for that email, we&apos;ve sent it a reset link. It expires in{' '}
          {PASSWORD_RESET_TTL_MINUTES} minutes — check your spam folder too.
        </Callout>
        <Button type="button" variant="secondary" size="lg" onClick={() => setSent(false)}>
          Try a different email
        </Button>
      </div>
    );
  }

  return (
    <Form
      form={form}
      className="mt-8"
      onFinish={async (values) => {
        const res = await forgotPasswordAction(values);
        if (handleActionResult(res, form, { successToast: false })) setSent(true);
      }}
    >
      <FormInput
        name="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <Button
        type="submit"
        variant="noir"
        size="xl"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
    </Form>
  );
}
