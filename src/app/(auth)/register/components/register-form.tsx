'use client';

import * as React from 'react';
import Link from 'next/link';

import { registerAction } from '@/actions/auth';
import { Form, FormInput, FormPassword } from '@components/form';
import { Callout } from '@components/shared/callout';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { EMAIL_VERIFICATION_TTL_HOURS } from '@lib/constants';
import { type RegisterInput, registerSchema } from '@lib/validators/auth';

export function RegisterForm({ next }: { next?: string }) {
  const [sentEmail, setSentEmail] = React.useState<string | null>(null);
  const form = Form.useForm<RegisterInput>({
    schema: registerSchema,
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });
  const { isSubmitting } = form.formState;

  if (sentEmail) {
    return (
      <div className="mt-8 flex flex-col gap-4">
        <Callout tone="success" title="Verify your email">
          We sent a verification link to <strong>{sentEmail}</strong>. Click the link in your
          inbox (or spam folder) to activate your account and sign in automatically. The link expires
          in {EMAIL_VERIFICATION_TTL_HOURS} hours.
        </Callout>
        <Button type="button" variant="secondary" size="lg" onClick={() => setSentEmail(null)}>
          Use a different email or resend
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>
            Already verified? Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Form
      form={form}
      className="mt-8"
      onFinish={async (values) => {
        const res = await registerAction(values);
        if (handleActionResult(res, form, { successToast: false })) {
          setSentEmail(res.data.email);
        }
      }}
    >
      <FormInput
        name="name"
        label="Full name"
        placeholder="e.g. Rahim Uddin"
        autoComplete="name"
        required
      />
      <FormInput
        name="phone"
        label="Mobile number"
        placeholder="01XXXXXXXXX"
        inputMode="tel"
        autoComplete="tel"
        hint="You'll sign in with this number"
        required
      />
      <FormInput
        name="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        hint="We'll send password-reset links here"
        required
      />
      <FormPassword
        name="password"
        label="Password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
      />
      <FormPassword
        name="confirmPassword"
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
      />
      <Button
        type="submit"
        variant="noir"
        size="xl"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </Form>
  );
}
