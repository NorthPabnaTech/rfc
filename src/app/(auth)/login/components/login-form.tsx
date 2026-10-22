'use client';

import Link from 'next/link';
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
    defaultValues: { identifier: '', password: '' },
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
      <FormInput
        name="identifier"
        label="Email or mobile number"
        placeholder="you@example.com or 01XXXXXXXXX"
        autoComplete="username"
        required
      />
      <FormPassword
        name="password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="type-helper text-accent hover:text-accent-hover font-semibold"
        >
          Forgot password?
        </Link>
      </div>
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
