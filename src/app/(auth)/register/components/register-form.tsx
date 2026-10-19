'use client';

import { useRouter } from 'next/navigation';

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
      <FormInput name="name" label="Full name" autoComplete="name" required />
      <FormInput name="email" label="Email" type="email" autoComplete="email" required />
      <FormInput
        name="phone"
        label="Mobile number"
        placeholder="01XXXXXXXXX"
        inputMode="tel"
        autoComplete="tel"
        required
      />
      <FormPassword
        name="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters"
        required
      />
      <FormPassword
        name="confirmPassword"
        label="Confirm password"
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
