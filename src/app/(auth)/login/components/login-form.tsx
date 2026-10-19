'use client';

import { useRouter } from 'next/navigation';

import { loginAction } from '@/actions/auth';
import { Form, FormInput, FormPassword } from '@components/form';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { type LoginInput, loginSchema } from '@lib/validators/auth';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const form = Form.useForm<LoginInput>({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
  });
  const { isSubmitting } = form.formState;

  return (
    <Form
      form={form}
      className="mt-8"
      onFinish={async (values) => {
        const res = await loginAction(values, next);
        if (handleActionResult(res, form, { successToast: false })) {
          router.replace(res.data.redirectTo);
          router.refresh();
        }
      }}
    >
      <FormInput name="email" label="Email" type="email" autoComplete="email" required />
      <FormPassword name="password" label="Password" autoComplete="current-password" required />
      <Button
        type="submit"
        variant="noir"
        size="xl"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </Form>
  );
}
