'use client';

import { useRouter } from 'nextjs-toploader/app';

import { registerAction } from '@/actions/auth';
import { Form, FormInput, FormPassword } from '@components/form';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { type RegisterInput, registerSchema } from '@lib/validators/auth';

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const form = Form.useForm<RegisterInput>({
    schema: registerSchema,
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });
  const { isSubmitting } = form.formState;

  return (
    <Form
      form={form}
      className="mt-8"
      onFinish={async (values) => {
        const res = await registerAction(values, next);
        if (handleActionResult(res, form, { successToast: false })) {
          router.replace(res.data.redirectTo);
          router.refresh();
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
